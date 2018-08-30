import {DeviceKey, Key, PublicKey, RecoveryKey, SessionKey, WrappedKey} from "./keys";
import {WebCryptoKeyGenerator, WebCryptoKeyStorage, WebCryptoMemoryKeyStorage} from "./webcrypto";

export interface KeyGenerator {
    generateWrappedStorageKey(deviceKey: DeviceKey): PromiseLike<WrappedKey>;

    generateDeviceKey(): PromiseLike<DeviceKey>;

    // TODO(cromwellian): implement PersonaKey
    // generatePersonaKey(): PromiseLike<PersonaKey>;

    generateAndStoreRecoveryKey(): PromiseLike<RecoveryKey>;
}

export interface KeyStorage {
    write(key: Key): PromiseLike<string>;
    find(keyFingerPrint: string): PromiseLike<Key>;
}

export class KeyManager {
    static getGenerator(): KeyGenerator {
        return WebCryptoKeyGenerator.getInstance();
        // return new AndroidWebViewKeyGenerator()
    }

    static getStorage(): KeyStorage {
        return WebCryptoMemoryKeyStorage.getInstance();
    }
}
