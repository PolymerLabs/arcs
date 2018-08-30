/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KeyManager} from '../ts-build/keymgmt/manager.js';
import {assert} from '../test/chai-web.js';
import WebCrypto from 'node-webcrypto-ossl';

global.crypto = new WebCrypto();

describe('arcs key management', function() {
    describe('KeyManager', () => {
        it('supports generating wrapped Storage keys from DeviceKeys, and rewrapping them', async () => {
            const keyGenerator = KeyManager.getGenerator();
            const deviceKey = await keyGenerator.generateDeviceKey();
            const cloudKey = await keyGenerator.generateDeviceKey();

            const storageKey = await KeyManager.getGenerator().generateWrappedStorageKey(deviceKey);
            assert.isNotNull(storageKey);

            const rewrappedKey = await storageKey.rewrap(deviceKey.privateKey(), cloudKey.publicKey());
            assert.isNotNull(rewrappedKey);

            // Test session key
            const sessionKey = await rewrappedKey.unwrap(cloudKey.privateKey());
            const testBuffer = new Uint8Array([42, 23, 99]);
            const encryptBuffer = await sessionKey.encrypt(testBuffer);
            const decryptBuffer = await sessionKey.decrypt(encryptBuffer);
            assert.deepEqual(testBuffer, new Uint8Array(decryptBuffer));
        });
    });

    describe('KeyStorage', () => {
        it('supports persisting DeviceKeys and wrapped Storage Keys', async () => {
            const keyGenerator = KeyManager.getGenerator();
            const deviceKey = await keyGenerator.generateDeviceKey();
            const keyStorage = KeyManager.getStorage();

            const storageKey = await KeyManager.getGenerator().generateWrappedStorageKey(deviceKey);
            assert.isNotNull(storageKey);

            await keyStorage.write(deviceKey);
            const foundKey = await keyStorage.find(await deviceKey.fingerprint());
            assert(await deviceKey.fingerprint(), await foundKey.fingerprint());

            await keyStorage.write(storageKey);
            const foundStorageKey = await keyStorage.find(await storageKey.fingerprint());
            assert(await foundStorageKey.fingerprint(), await storageKey.fingerprint());

            const sessionKey = await storageKey.unwrap(deviceKey.privateKey());
            const foundSessionKey = await foundStorageKey.unwrap(foundKey.privateKey());
            const testBuffer = new Uint8Array([42, 23, 99]);
            const encryptBuffer = await sessionKey.encrypt(testBuffer);
            const decryptBuffer = await foundSessionKey.decrypt(encryptBuffer);
            assert.deepEqual(testBuffer, new Uint8Array(decryptBuffer));
        });
    });

});
