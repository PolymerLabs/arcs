import {DeviceKey, Key, PublicKey, RecoveryKey, SessionKey, WrappedKey} from "./keys";
import {
    WebCryptoKeyGenerator,
    WebCryptoKeyIndexedDBStorage,
    WebCryptoMemoryKeyStorage
} from "./webcrypto";


export interface KeyGenerator {
    generateWrappedStorageKey(deviceKey: DeviceKey): PromiseLike<WrappedKey>;

    generateDeviceKey(): PromiseLike<DeviceKey>;

    // TODO(cromwellian): implement PersonaKey
    // generatePersonaKey(): PromiseLike<PersonaKey>;

    generateAndStoreRecoveryKey(): PromiseLike<RecoveryKey>;

    importKey(pem: string): PromiseLike<PublicKey>;
}

export interface KeyStorage {
    write(key: Key): PromiseLike<string>;
    find(keyFingerPrint: string): PromiseLike<Key>;
}



declare var global: {};

export class KeyManager {
    static getGenerator(): KeyGenerator {
        return WebCryptoKeyGenerator.getInstance();
        // return AndroidWebViewKeyGenerator.getInstance()
    }

    static getStorage(): KeyStorage {
        const globalScope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : global);
        return globalScope['indexedDB'] != null ? WebCryptoKeyIndexedDBStorage.getInstance() : WebCryptoMemoryKeyStorage.getInstance();
        // return AndroidWebViewKeyStorage.getInstance()
    }
}
