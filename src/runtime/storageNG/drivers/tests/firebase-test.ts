/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageKey} from '../../storage-key.js';
import {assert} from '../../../../platform/chai-web.js';
import {RuntimeCacheService} from '../../../runtime-cache.js';
import {Exists} from '../driver.js';
import {FirebaseStorageDriverProvider, FirebaseStorageKey} from '../firebase.js';
import {MockFirebaseStorageDriverProvider, MockFirebaseStorageKey} from '../../testing/mock-firebase.js';
import {assertThrowsAsync} from '../../../../testing/test-util.js';
import {VolatileStorageKey} from '../volatile.js';
import {ArcId} from '../../../id.js';

describe('Firebase Driver', async () => {
  let cacheService;
  beforeEach(() => {
    cacheService = new RuntimeCacheService();
  });

  const newDriver = async <Data>(storageKey: StorageKey, exists: Exists) => {
    return MockFirebaseStorageDriverProvider.newDriverForTesting<Data>(
        cacheService, storageKey, exists);
  };

  it('can be multiply instantiated against the same storage location', async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');

    const firebase1 = await newDriver(firebaseKey, Exists.ShouldCreate);
    const firebase2 = await newDriver(firebaseKey, Exists.ShouldExist);
  });

  it('treats keys constructed separately as the same if the details are the same', async () => {
    const key1 = new MockFirebaseStorageKey('test-location');
    const key2 = new MockFirebaseStorageKey('test-location');

    const firebase1 = await newDriver(key1, Exists.ShouldCreate);
    const firebase2 = await newDriver(key2, Exists.ShouldExist);
  });

  it(`can't be instantiated as ShouldExist if the storage location doesn't yet exist`, async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    await assertThrowsAsync(
      () => newDriver(firebaseKey, Exists.ShouldExist), `location doesn't exist`);
  });

  it(`can't be instantiated as ShouldCreate if the storage location already exists`, async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    const firebase1 = await newDriver(firebaseKey, Exists.ShouldCreate);

    await assertThrowsAsync(
      () => newDriver(firebaseKey, Exists.ShouldCreate), `location already exists`);
  });

  it('can be instantiated either as a creation or as a connection using MayExist', async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    const firebase1 =  await newDriver(firebaseKey, Exists.MayExist);
    const firebase2 =  await newDriver(firebaseKey, Exists.MayExist);
  });

  it('transmits a write to a connected driver', async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    const firebase1 = await newDriver<number>(firebaseKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    firebase1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    await firebase1.send(3, 1);

    const firebase2 = await newDriver<number>(firebaseKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    firebase2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    assert.isEmpty(recvQueue1);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });

  it(`won't accept out-of-date writes`, async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    const firebase1 = await newDriver<number>(firebaseKey, Exists.ShouldCreate);

    assert.isTrue(await firebase1.send(3, 1));
    assert.isFalse(await firebase1.send(4, 0));
    assert.isFalse(await firebase1.send(4, 1));
    assert.isFalse(await firebase1.send(4, 3));
    assert.isTrue(await firebase1.send(4, 2));
  });

  it('will only accept a given version from one connected driver', async () => {
    const firebaseKey = new MockFirebaseStorageKey('test-location');
    const firebase1 = await newDriver<number>(firebaseKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    firebase1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const firebase2 = await newDriver<number>(firebaseKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    firebase2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    const promise1 = firebase1.send(3, 1);
    const promise2 = firebase2.send(4, 1);

    const results = await Promise.all([promise1, promise2]);
    assert.deepEqual(results, [true, false]);
    assert.strictEqual(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });
});
