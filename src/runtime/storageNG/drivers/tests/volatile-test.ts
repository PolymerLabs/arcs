/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../platform/chai-web.js';
import {VolatileDriver, VolatileStorageKey} from '../volatile.js';
import {Exists} from '../driver-factory.js';
import {Runtime} from '../../../runtime.js';

describe('Volatile Driver', async () => {

  afterEach(() => {
    Runtime.clearRuntimeForTesting();
  });

  it('can be multiply instantiated against the same storage location', () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate);
    const volatile2 = new VolatileDriver(volatileKey, Exists.ShouldExist);
  });

  it('treats keys constructed separately as the same if the details are the same', async () => {
    const key1 = new VolatileStorageKey('test-location');
    const key2 = new VolatileStorageKey('test-location');

    const volatile1 = new VolatileDriver(key1, Exists.ShouldCreate);
    const volatile2 = new VolatileDriver(key2, Exists.ShouldExist);
  });

  it(`can't be instantiated as ShouldExist if the storage location doesn't yet exist`, () => {
    const volatileKey = new VolatileStorageKey('unique');
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldExist), `location doesn't exist`);
  });

  it(`can't be instantiated as ShouldCreate if the storage location already exists`, () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate);
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldCreate), 'location already exists');
  });

  it('can be instantiated either as a creation or as a connection using MayExist', () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.MayExist);
    const volatile2 = new VolatileDriver(volatileKey, Exists.MayExist);
  });

  it('transmits a write to a connected driver', async () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    volatile1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const volatile2 = new VolatileDriver<number>(volatileKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    volatile2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    await volatile1.send(3, 1);
    assert.equal(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });

  it(`won't accept out-of-date writes`, async () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate);

    assert.equal(true, await volatile1.send(3, 1));
    assert.equal(false, await volatile1.send(4, 0));
    assert.equal(false, await volatile1.send(4, 1));
    assert.equal(false, await volatile1.send(4, 3));
    assert.equal(true, await volatile1.send(4, 2));
  });

  it('will only accept a given version from one connected driver', async () => {
    const volatileKey = new VolatileStorageKey('unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate);
    const recvQueue1: {model: number, version: number}[] = [];
    volatile1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const volatile2 = new VolatileDriver<number>(volatileKey, Exists.ShouldExist);
    const recvQueue2: {model: number, version: number}[] = [];
    volatile2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    const promise1 = volatile1.send(3, 1);
    const promise2 = volatile2.send(4, 1);

    const results = await Promise.all([promise1, promise2]);
    assert.deepEqual([true, false], results);
    assert.equal(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });
});
