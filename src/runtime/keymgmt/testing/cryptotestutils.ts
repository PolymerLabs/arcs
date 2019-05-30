/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {DeviceKey, Key, WrappedKey} from '../keys';
import {KeyStorage} from '../manager';

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
