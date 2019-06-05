/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Runtime} from '../../../runtime.js';
import {FirebaseStorageKey, FirebaseDriver} from '../firebase.js';
import {assert} from '../../../../platform/chai-web.js';
import {Exists} from '../driver-factory.js';
import {FakeFirebaseStorageDriverProvider} from '../../testing/mock-firebase.js';

describe('Firebase Driver', async () => {

  beforeEach(() => {
    Runtime.clearRuntimeForTesting();
  });

  after(() => {
    Runtime.clearRuntimeForTesting();
  });

  it('can be multiply instantiated against the same storage location', async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    
    const firebase1 = await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.ShouldCreate);
    const firebase2 = await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.ShouldExist);
  });

  it(`can't be instantiated as ShouldExist if the storage location doesn't yet exist`, async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    try {
      await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.ShouldExist);
      assert.fail('should throw exception');
    } catch (e) {
      assert.equal(e.toString(), `Error: requested connection to memory location [object Object] can't proceed as location doesn't exist`);
    }
  });

  it(`can't be instantiated as ShouldCreate if the storage location already exists`, async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    const firebase1 = await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.ShouldCreate);
    
    try {
      await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.ShouldCreate);
      assert.fail('should throw exception');
    } catch (e) {
      assert.equal(e.toString(),  `Error: requested creation of memory location [object Object] can't proceed as location already exists`);
    }
  });

  it('can be instantiated either as a creation or as a connection using MayExist', async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    const firebase1 =  await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.MayExist);
    const firebase2 =  await FakeFirebaseStorageDriverProvider.newDriverForTesting(firebaseKey, Exists.MayExist);
  });

  it('transmits a write to a connected driver', async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    const firebase1 = await FakeFirebaseStorageDriverProvider.newDriverForTesting<number>(firebaseKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    firebase1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    await firebase1.send(3, 1);

    const firebase2 = await FakeFirebaseStorageDriverProvider.newDriverForTesting<number>(firebaseKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    firebase2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    assert.isEmpty(recvQueue1);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });

  it(`won't accept out-of-date writes`, async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    const firebase1 = await FakeFirebaseStorageDriverProvider.newDriverForTesting<number>(firebaseKey, Exists.ShouldCreate);

    assert.isTrue(await firebase1.send(3, 1));
    assert.isFalse(await firebase1.send(4, 0));
    assert.isFalse(await firebase1.send(4, 1));
    assert.isFalse(await firebase1.send(4, 3));
    assert.isTrue(await firebase1.send(4, 2));
  });

  it('will only accept a given version from one connected driver', async () => {
    const firebaseKey = new FirebaseStorageKey('test-url', 'test-project', 'test-key', 'test-location');
    const firebase1 = await FakeFirebaseStorageDriverProvider.newDriverForTesting<number>(firebaseKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    firebase1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const firebase2 = await FakeFirebaseStorageDriverProvider.newDriverForTesting<number>(firebaseKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    firebase2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    const promise1 = firebase1.send(3, 1);
    const promise2 = firebase2.send(4, 1);

    const results = await Promise.all([promise1, promise2]);
    assert.deepEqual(results, [true, false]);
    assert.equal(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });
});
