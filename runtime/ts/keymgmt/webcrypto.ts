import {DeviceKey, Key, PrivateKey, PublicKey, RecoveryKey, SessionKey, WrappedKey} from "./keys";
import {KeyGenerator, KeyStorage} from "./manager";
import idb, {ObjectStore} from 'idb';
import {decode, encode} from './base64';
import rs from 'jsrsasign';

class WebCryptoStorableKey<T> {

    protected key: T;

    constructor(key: T) {
        this.key = key;
    }

    algorithm(): string {
        // @ts-ignore
        return (this.key as CryptoKey).algorithm.name;
    }

    storableKey(): T {
        return this.key;
    }
}

class WebCryptoWrappedKey implements WrappedKey {
    private wrappedKeyData: Uint8Array;
    private wrappedBy: PublicKey;

    constructor(wrappedKeyData: Uint8Array, wrappedBy: PublicKey) {
        this.wrappedKeyData = wrappedKeyData;
        this.wrappedBy = wrappedBy;
    }

    algorithm(): string {
        return this.wrappedBy.algorithm();
    }

    private unwrap(privKey: PrivateKey): PromiseLike<SessionKey> {
        const webPrivKey = privKey as WebCryptoPrivateKey;

        return crypto.subtle.unwrapKey(
            "raw",
            this.wrappedKeyData,
            webPrivKey.cryptoKey(),
            {
                name: privKey.algorithm()
            },
            {
                name: "AES-GCM",
            },
            true,
            ["encrypt", "decrypt"]
        ).then(key => new WebCryptoSessionKey(key));
    }

    rewrap(privKey: PrivateKey, pubKey: PublicKey): PromiseLike<WrappedKey> {
        return this.unwrap(privKey).then(skey => skey.disposeToWrappedKeyUsing(pubKey));
    }

    export(): string {
        return encode(this.wrappedKeyData.buffer as ArrayBuffer);
    }

    fingerprint(): PromiseLike<string> {
        return Promise.resolve(encode(this.wrappedKeyData.buffer as ArrayBuffer));
    }
}

class WebCryptoPrivateKey extends WebCryptoStorableKey<CryptoKey> implements PrivateKey {
    constructor(key) {
        super(key);
    }

    cryptoKey() {
        return this.storableKey();
    }

    fingerprint(): PromiseLike<string> {
        return Promise.resolve("");
    }
}

class WebCryptoPublicKey extends WebCryptoStorableKey<CryptoKey> implements PublicKey {

    constructor(key) {
        super(key);
    }

    cryptoKey() {
        return this.storableKey();
    }

    fingerprint(): PromiseLike<string> {
        // TODO: fix this with a proper hash based fingerprint/thumbprint
        return crypto.subtle.exportKey("jwk", this.cryptoKey()).then(key => JSON.stringify(key));
    }
}

class WebCryptoSessionKey implements SessionKey {
    decrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer> {
        return crypto.subtle.decrypt({
            name: this.algorithm(),
            iv: this.iv,
        }, this.sessionKey, buffer);
    }

    encrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer> {
        return crypto.subtle.encrypt(
            {
                name: this.algorithm(),
                iv: this.iv
            }, this.sessionKey, buffer);
    }

    sessionKey: CryptoKey;
    // Cached IV only for testing currently
    iv: Uint8Array;

    constructor(sessionKey: CryptoKey) {
        this.sessionKey = sessionKey;
        // hack for unit testing
        this.iv = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }

    algorithm(): string {
        return "AES-GCM";
    }

    disposeToWrappedKeyUsing(pkey: PublicKey): PromiseLike<WrappedKey> {
        try {
            const webPkey = pkey as WebCryptoPublicKey;

            const rawWrappedKey = crypto.subtle.wrapKey("raw",
                this.sessionKey,
                (pkey as WebCryptoPublicKey).cryptoKey(),
                {   //these are the wrapping key's algorithm options
                    name: webPkey.algorithm(),
                }
            );
            return rawWrappedKey.then(rawKey => new WebCryptoWrappedKey(new Uint8Array(rawKey), pkey));
        } finally {
            // Hopefully this frees the underlying key material
            this.sessionKey = null;
        }
    }

    isDisposed(): boolean {
        return this.sessionKey != null;
    }

    fingerprint(): PromiseLike<string> {
        return Promise.resolve("");
    }
}

class WebCryptoDeviceKey extends WebCryptoStorableKey<CryptoKeyPair> implements DeviceKey {

    algorithm(): string {
        return this.publicKey().algorithm();
    }

    constructor(key: CryptoKeyPair) {
        super(key);
    }

    privateKey(): PrivateKey {
        return new WebCryptoPrivateKey(this.key.privateKey);
    }

    publicKey(): PublicKey {
        return new WebCryptoPublicKey(this.key.publicKey);
    }

    fingerprint(): PromiseLike<string> {
        return this.publicKey().fingerprint();
    }
}

export class WebCryptoKeyGenerator implements KeyGenerator {
    generateWrappedStorageKey(deviceKey: DeviceKey): PromiseLike<WrappedKey> {
        const generatedKey: PromiseLike<CryptoKey> = crypto.subtle.generateKey({name: 'AES-GCM', length: 256},
            true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]);
        return generatedKey.then(key => new WebCryptoSessionKey(key))
            .then(skey => skey.disposeToWrappedKeyUsing(deviceKey.publicKey()));
    }

    static getInstance() {
        return new WebCryptoKeyGenerator();
    }

    generateAndStoreRecoveryKey(): PromiseLike<RecoveryKey> {
        return undefined;
    }

    generateDeviceKey(): PromiseLike<DeviceKey> {
        const generatedKey: PromiseLike<CryptoKeyPair> = crypto.subtle.generateKey(
            {
                hash: {name: "SHA-512"},
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            },
            false, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]);
        return generatedKey.then(key => new WebCryptoDeviceKey(key));
    }

    importKey(pemKey: string): PromiseLike<PublicKey> {
        const key = rs.KEYUTIL.getKey(pemKey);
        const jwk = rs.KEYUTIL.getJWKFromKey(key);

        return crypto.subtle.importKey("jwk",
            jwk as JsonWebKey,
            {
                name: "RSA-OAEP",
                hash: {name: "SHA-1"}
            }, true, ["encrypt", "wrapKey"]).then(ikey => new WebCryptoPublicKey(ikey));
    }
}

export class WebCryptoMemoryKeyStorage implements KeyStorage {
    storageMap: Map<string, Key>;

    constructor() {
        this.storageMap = new Map();
    }

    find(keyFingerPrint: string): PromiseLike<Key> {
        return Promise.resolve(this.storageMap.get(keyFingerPrint));
    }

    async write(key: Key): Promise<string> {
        const id = await key.fingerprint();
        this.storageMap.set(id, key);
        return Promise.resolve(key.fingerprint());
    }

    static getInstance() {
        return new WebCryptoMemoryKeyStorage();
    }
}

export class WebCryptoKeyIndexedDBStorage implements KeyStorage {

    async runOnStore(fn: (store: ObjectStore<{}, IDBValidKey>) => PromiseLike<IDBValidKey>) {
        const db = await idb.open('ArcsKeyManagement', 1,
            upgradeDB => upgradeDB.createObjectStore('ArcsKeyManagementStore',
                {autoIncrement: true}));

        const tx = db.transaction('ArcsKeyManagementStore', 'readwrite');
        const store = tx.objectStore('ArcsKeyManagementStore');
        const result = await fn(store);
        await tx.complete;
        db.close();
        return Promise.resolve(result);
    }

    find(keyId: string): PromiseLike<Key> {
        return undefined;
    }

    async write(key: Key): Promise<string> {
        if (key instanceof WebCryptoStorableKey) {
            const skey = key as WebCryptoStorableKey<CryptoKey>;
            const fingerprint = await key.fingerprint();
            await this.runOnStore(store => {
                return store.put({keyFingerPrint: fingerprint, key: skey.storableKey()});
            });
            return await key.fingerprint();
        }
        return Promise.reject("Can't write key that isn't storableKey.");
    }

    static getInstance() {
        return new WebCryptoKeyIndexedDBStorage();
    }
}
