import {KeyStorage} from "../manager";
import {DeviceKey, Key, WrappedKey} from "../keys";

export interface TestableKey {
    // Visible For Testing
    encrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer>;
    // Visible for Testing
    decrypt(buffer: ArrayBuffer): PromiseLike<ArrayBuffer>;
}

/**
 * Implementation of KeyStorage using a Map, used for testing only.
 */
export class WebCryptoMemoryKeyStorage implements KeyStorage {
    storageMap: Map<string, Key>;

    constructor() {
        this.storageMap = new Map();
    }

    find(keyFingerPrint: string): PromiseLike<Key> {
        return Promise.resolve(this.storageMap.get(keyFingerPrint));
    }

    async write(key: DeviceKey|WrappedKey): Promise<string> {
        const id = await key.fingerprint();
        this.storageMap.set(id, key);
        return Promise.resolve(key.fingerprint());
    }

    static getInstance() {
        return new WebCryptoMemoryKeyStorage();
    }
}
