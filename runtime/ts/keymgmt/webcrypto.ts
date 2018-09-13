/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {DeviceKey, Key, PrivateKey, PublicKey, RecoveryKey, SessionKey, WrappedKey} from "./keys";
import {KeyGenerator, KeyStorage} from "./manager";
import idb, {ObjectStore} from 'idb';
import {encode} from './base64';
import rs from 'jsrsasign';
import {TestableKey} from "./testing/cryptotestutils";

const DEVICE_KEY_ALGORITHM = 'RSA-OAEP';
const X509_CERTIFICATE_ALGORITHM = "RSA-OAEP";
const X509_CERTIFICATE_HASH_ALGORITHM = "SHA-1";
const DEVICE_KEY_HASH_ALGORITHM = "SHA-512";
const STORAGE_KEY_ALGORITHM = "AES-GCM";

const ARCS_CRYPTO_STORE_NAME = 'ArcsKeyManagementStore';
const ARCS_CRYPTO_INDEXDB_NAME = 'ArcsKeyManagement';

/**
 * A CryptoKey or CryptoKeyPair that is capable of being stored in IndexDB key storage.
 */
class WebCryptoStorableKey<T extends CryptoKey | CryptoKeyPair> {

    protected key: T;

    constructor(key: T) {
        this.key = key;

    }

    algorithm(): string {
        return (this.key as CryptoKey).algorithm ?  (this.key as CryptoKey).algorithm.name :
        (this.key as CryptoKeyPair).publicKey.algorithm.name;
    }

    storableKey(): T {
        return this.key;
    }
}


/**
 * An AES-GCM symmetric key in raw formatted encrypted using an RSA-OAEP public key.
 */
class WebCryptoWrappedKey implements WrappedKey {
    wrappedKeyData: Uint8Array;
    wrappedBy: PublicKey;

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
                name: STORAGE_KEY_ALGORITHM,
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

/**
 * An implementation of PrivateKey using WebCrypto.
 */
class WebCryptoPrivateKey extends WebCryptoStorableKey<CryptoKey> implements PrivateKey {
    constructor(key) {
        super(key);
    }

    cryptoKey() {
        return this.storableKey();
    }
}

/**
 * An implementation of PublicKey using WebCrypto.
 */
class WebCryptoPublicKey extends WebCryptoStorableKey<CryptoKey> implements PublicKey {

    constructor(key) {
        super(key);
    }

    cryptoKey() {
        return this.storableKey();
    }

    fingerprint(): PromiseLike<string> {
        // TODO: fix this with a proper hash based fingerprint/thumbprint, right now is just serializes to JWK.
        return crypto.subtle.exportKey("jwk", this.cryptoKey()).then(key => JSON.stringify(key));
    }
}

class WebCryptoSessionKey implements SessionKey, TestableKey {
    // Visible/Used for testing only.
    decrypt(buffer: ArrayBuffer, iv: Uint8Array): PromiseLike<ArrayBuffer> {
        return crypto.subtle.decrypt({
            name: this.algorithm(),
            iv,
        }, this.sessionKey, buffer);
    }

    // Visible/Used for testing only.
    encrypt(buffer: ArrayBuffer, iv: Uint8Array): PromiseLike<ArrayBuffer> {
        return crypto.subtle.encrypt(
            {
                name: this.algorithm(),
                iv
            }, this.sessionKey, buffer);
    }

    sessionKey: CryptoKey;

    constructor(sessionKey: CryptoKey) {
        this.sessionKey = sessionKey;

    }

    algorithm(): string {
        return this.sessionKey.algorithm.name;
    }

    /**
     * Encrypts this session key with the private key, and makes a best effort to destroy the session
     * key material (presumably erased during garbage collection).
     * @param pkey
     */
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

    /**
     * Returns a fingerprint of the public key of the devicekey pair.
     */
    fingerprint(): PromiseLike<string> {
        return this.publicKey().fingerprint();
    }
}

/**
 * Implementation of KeyGenerator using WebCrypto interface.
 */
export class WebCryptoKeyGenerator implements KeyGenerator {
    generateWrappedStorageKey(deviceKey: DeviceKey): PromiseLike<WrappedKey> {
        const generatedKey: PromiseLike<CryptoKey> = crypto.subtle.generateKey({name: 'AES-GCM', length: 256},
            true, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]);
        return generatedKey.then(key => new WebCryptoSessionKey(key))
            .then(skey => skey.disposeToWrappedKeyUsing(deviceKey.publicKey()));
    }

    static getInstance() {
        // TODO: may want to reuse instance in future
        return new WebCryptoKeyGenerator();
    }

    generateAndStoreRecoveryKey(): PromiseLike<RecoveryKey> {
        // TODO: Implement
        return Promise.reject("Not implemented");
    }

    generateDeviceKey(): PromiseLike<DeviceKey> {
        const generatedKey: PromiseLike<CryptoKeyPair> = crypto.subtle.generateKey(
            {
                hash: {name: DEVICE_KEY_HASH_ALGORITHM},
                // TODO: Note, RSA-OAEP is deprecated, we should move to ECDH in the future, but it
                // doesn't use key-wrapping, instead it uses a different mechanism: key-derivation.
                name: DEVICE_KEY_ALGORITHM,
                modulusLength: 2048,
                // exponent is only allowed to be 3 or 65537 for RSA
                publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            },
            // false means the key material is not visible to the application
            false, ["encrypt", "decrypt", "wrapKey", "unwrapKey"]);
        return generatedKey.then(key => new WebCryptoDeviceKey(key));
    }

    /**
     * Decodes X509 PEM certificates, extracts their key material, and returns a PublicKey.
     * @param pemKey
     */
    importKey(pemKey: string): PromiseLike<PublicKey> {
        const key = rs.KEYUTIL.getKey(pemKey);
        const jwk = rs.KEYUTIL.getJWKFromKey(key);

        return crypto.subtle.importKey("jwk",
            jwk as JsonWebKey,
            {
                name: X509_CERTIFICATE_ALGORITHM,
                hash: {name: X509_CERTIFICATE_HASH_ALGORITHM}
            }, true, ["encrypt", "wrapKey"]).then(ikey => new WebCryptoPublicKey(ikey));
    }
}

interface KeyRecord {
    keyFingerPrint: string;
    key: CryptoKey|CryptoKeyPair|Uint8Array;
    wrappingKeyFingerprint?: string;
}

/**
 * The Web Crypto spec states that IndexDB may be used to store CryptoKey objects without ever exposing
 * key material to the application: https://www.w3.org/TR/WebCryptoAPI/#concepts-key-storage
 */
export class WebCryptoKeyIndexedDBStorage implements KeyStorage {

    async runOnStore<T>(fn: (store: ObjectStore<KeyRecord, IDBValidKey>) => PromiseLike<T>) {
        try {
            const db = await idb.open(ARCS_CRYPTO_INDEXDB_NAME, 1,
                upgradeDB => upgradeDB.createObjectStore(ARCS_CRYPTO_STORE_NAME,
                    {autoIncrement: true}));

            const tx = db.transaction(ARCS_CRYPTO_STORE_NAME, 'readwrite');
            const store = tx.objectStore(ARCS_CRYPTO_STORE_NAME);
            const result = await fn(store);
            await tx.complete;
            db.close();
            return Promise.resolve(result);
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async find(keyId: string): Promise<Key> {
        const result:KeyRecord = await this.runOnStore(store => {
            return store.get(keyId);
        });

        if (result.key instanceof CryptoKeyPair) {
            return Promise.resolve(new WebCryptoDeviceKey(result.key as CryptoKeyPair));
        } else if (result.key instanceof CryptoKey) {
            return Promise.resolve(new WebCryptoPublicKey(result.key as CryptoKey));
        } else if (result.key instanceof Uint8Array) {
            const wrappedBy = await this.find(result.wrappingKeyFingerprint) as PublicKey;
            return Promise.resolve(new WebCryptoWrappedKey(result.key as Uint8Array,
                wrappedBy));
        }
        return Promise.reject("Unrecognized key type found in keystore.");
    }

    async write(keyFingerPrint: string, key: DeviceKey|WrappedKey): Promise<string> {
        if (key instanceof WebCryptoStorableKey) {
            const skey = key as WebCryptoStorableKey<CryptoKey>;
            await this.runOnStore(store => {
                return store.put({keyFingerPrint, key: skey.storableKey()});
            });
            return keyFingerPrint;
        } else if (key instanceof WebCryptoWrappedKey) {
            const wrappedKey = key as WebCryptoWrappedKey;
            const wrappingKeyFingerprint = await wrappedKey.wrappedBy.fingerprint();

            await this.runOnStore(store => {
                return store.put({keyFingerPrint, key:wrappedKey.wrappedKeyData,
                    wrappingKeyFingerprint});
            });
            return keyFingerPrint;
        }
        return Promise.reject("Can't write key that isn't StorableKey or WrappedKey.");
    }

    static getInstance() {
        // TODO: If IndexDB open/close is expensive, we may want to reuse instances.
        return new WebCryptoKeyIndexedDBStorage();
    }
}
