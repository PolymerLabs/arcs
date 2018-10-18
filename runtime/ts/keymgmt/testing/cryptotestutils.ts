import {KeyStorage} from "../manager";
import {DeviceKey, Key, WrappedKey} from "../keys";

export interface TestableKey {
    // Visible For Testing
    encrypt(buffer: ArrayBuffer, iv: Uint8Array): PromiseLike<ArrayBuffer>;
    // Visible for Testing
    decrypt(buffer: ArrayBuffer, iv: Uint8Array): PromiseLike<ArrayBuffer>;
}

/**
 * Implementation of KeyStorage using a Map, used for testing only.
 */
export class WebCryptoMemoryKeyStorage implements KeyStorage {
    storageMap: Map<string, Key>;

    constructor() {
        this.storageMap = new Map();
    }

    find(keyFingerPrint: string): PromiseLike<Key|null> {
        return Promise.resolve(this.storageMap.get(keyFingerPrint));
    }

    async write(keyFingerprint: string, key: DeviceKey|WrappedKey): Promise<string> {
        this.storageMap.set(keyFingerprint, key);
        return Promise.resolve(keyFingerprint);
    }

    static getInstance() {
        return new WebCryptoMemoryKeyStorage();
    }
}
