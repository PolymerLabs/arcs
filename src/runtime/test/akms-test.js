/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {KeyManager} from '../keymgmt/manager.js';
import {assert} from '../test/chai-web.js';
import {crypto} from '../../platform/crypto-web.js';

describe('arcs key management', function() {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').
  let IV;
  before(() => {
    IV = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('KeyManager supports generating wrapped Storage keys from DeviceKeys, and rewrapping them', async () => {
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
    const encryptBuffer = await sessionKey.encrypt(testBuffer, IV);
    const decryptBuffer = await sessionKey.decrypt(encryptBuffer, IV);
    assert.deepEqual(testBuffer, new Uint8Array(decryptBuffer));
  });

  it('KeyStorage supports persisting DeviceKeys and wrapped Storage Keys', async () => {
    const keyGenerator = KeyManager.getGenerator();
    const deviceKey = await keyGenerator.generateDeviceKey();
    const keyStorage = KeyManager.getStorage();

    const storageKey = await KeyManager.getGenerator().generateWrappedStorageKey(deviceKey);
    assert.isNotNull(storageKey);

    await keyStorage.write(await deviceKey.fingerprint(), deviceKey);
    const foundKey = await keyStorage.find(await deviceKey.fingerprint());
    assert(await deviceKey.fingerprint(), await foundKey.fingerprint());

    await keyStorage.write(await storageKey.fingerprint(), storageKey);
    const foundStorageKey = await keyStorage.find(await storageKey.fingerprint());
    assert(await foundStorageKey.fingerprint(), await storageKey.fingerprint());

    const sessionKey = await storageKey.unwrap(deviceKey.privateKey());
    const foundSessionKey = await foundStorageKey.unwrap(foundKey.privateKey());
    const testBuffer = new Uint8Array([42, 23, 99]);
    const encryptBuffer = await sessionKey.encrypt(testBuffer, IV);
    const decryptBuffer = await foundSessionKey.decrypt(encryptBuffer, IV);
    assert.deepEqual(testBuffer, new Uint8Array(decryptBuffer));
  });

  it('supports importing GCP PEM keys and exporting a rewrapped key', async () => {
    const keyGenerator = KeyManager.getGenerator();
    const deviceKey = await keyGenerator.generateDeviceKey();

    const storageKey = await KeyManager.getGenerator().generateWrappedStorageKey(deviceKey);
    assert.isNotNull(storageKey);

    const pemKey = `
-----BEGIN CERTIFICATE-----
MIIDpTCCAo2gAwIBAgIJAKHWfy0ksyvTMA0GCSqGSIb3DQEBCwUAMGkxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQHDA1Nb3VudGFpbiBW
aWV3MRcwFQYDVQQDDA53d3cuZ29vZ2xlLmNvbTEUMBIGA1UECgwLR29vZ2xlIElu
Yy4wHhcNMTUwNTA1MjA0NjUyWhcNMzUwNDMwMjA0NjUyWjBpMQswCQYDVQQGEwJV
UzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNTW91bnRhaW4gVmlldzEX
MBUGA1UEAwwOd3d3Lmdvb2dsZS5jb20xFDASBgNVBAoMC0dvb2dsZSBJbmMuMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApg4Oo7ygEBmAlzhUZFm275K9
99TqNjvgiAi/pSzAJS6XO3sa346zZYjZpj4l4OP5T2xlmPXoF/igbCO9jAeW+Y8N
1VZ6LRvPQ+ndP22ZyL/kiJFc1jUVrBm9ItzTGSO44Z4A77uDga1eAWkIg/9imp+t
Y0qmlmhnRHwoQkZDU1c08SLA4p6IV3NssgwKaN8KwM53KDxw6kDo0INfS+YmMNZ8
oHg8FJ5Q3ExR54fD1/WFngOSexpzNtGvZGMaoCnISMumEo8nfENtMXxnLquuBvYA
OQEQs7vl0ES/DD0dNzVonZTo9/c8yr0SlcWg8Uy7XkD5FQSE5A87pOZUDEcDFQID
AQABo1AwTjAdBgNVHQ4EFgQUyvS9JwDr23xu4x9DeX/UgsonXGgwHwYDVR0jBBgw
FoAUyvS9JwDr23xu4x9DeX/UgsonXGgwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0B
AQsFAAOCAQEAABqscAmzc3VKbvBxogf9qSBC7h5mn2eVmqSLniGjGeHmZMkn5O9k
Zu1w4olSi8+zz6bdcFm0yYMrt6qSuM2BlEqoiQET9Tby5o6zwtjkO+krbLjKDCY2
EuDwFXxkDLxVFY821Exx/STpoZHEr5mcuHDPePVhToG4T/xaL+gyxJao7eENt3pv
MYkhbFJicF3ctWnxKxAhWLP2+n5CVtXwdEzs/0zfyVIauyZFnAP2dgCt+hIdjoWf
psqMmQMry+xLiego9EZPkVmO/Nk6yI2d7OlVft6XCXmBmkgaaYPlWdy/8aq0koTt
mxbV98vjuW6lMTn7t+DZN95f6IJn9AOnhw==
-----END CERTIFICATE-----
`;
    const gcpPublicKey = await keyGenerator.importKey(pemKey);

    const rewrappedKey = await storageKey.rewrap(deviceKey.privateKey(), gcpPublicKey);
    assert.isNotNull(rewrappedKey);

    const exportedRewrappedKey = rewrappedKey.export();
    assert.isNotNull(exportedRewrappedKey);

    // TODO: add a docker container on GCP that we can test this against
  });
});
