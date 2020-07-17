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
import {VolatileDriver, VolatileStorageKey, VolatileMemory, VolatileStorageDriverProvider} from '../volatile.js';
import {Exists} from '../driver.js';
import {Runtime} from '../../../runtime.js';
import {ArcId} from '../../../id.js';
import {RamDiskStorageKey} from '../ramdisk.js';
import {assertThrowsAsync} from '../../../../testing/test-util.js';

describe('Volatile Driver', async () => {

  const arcId = ArcId.newForTest('arc');
  const memory = new VolatileMemory();

  afterEach(() => {
    memory.entries.clear();
    Runtime.clearRuntimeForTesting();
  });

  it('can be multiply instantiated against the same storage location', () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate, memory);
    const volatile2 = new VolatileDriver(volatileKey, Exists.ShouldExist, memory);
  });

  it('treats keys constructed separately as the same if the details are the same', async () => {
    const key1 = new VolatileStorageKey(arcId, 'test-location');
    const key2 = new VolatileStorageKey(arcId, 'test-location');

    const volatile1 = new VolatileDriver(key1, Exists.ShouldCreate, memory);
    const volatile2 = new VolatileDriver(key2, Exists.ShouldExist, memory);
  });

  it(`can't be instantiated as ShouldExist if the storage location doesn't yet exist`, () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldExist, memory), `location doesn't exist`);
  });

  it(`can't be instantiated as ShouldCreate if the storage location already exists`, () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.ShouldCreate, memory);
    assert.throws(() => new VolatileDriver(volatileKey, Exists.ShouldCreate, memory), 'location already exists');
  });

  it('can be instantiated either as a creation or as a connection using MayExist', () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver(volatileKey, Exists.MayExist, memory);
    const volatile2 = new VolatileDriver(volatileKey, Exists.MayExist, memory);
  });

  it('transmits a write to a connected driver', async () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate, memory);
    const recvQueue1: {model: number, version: number}[] = [];
    volatile1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const volatile2 = new VolatileDriver<number>(volatileKey, Exists.ShouldExist, memory);
    const recvQueue2: {model: number, version: number}[] = [];
    volatile2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    await volatile1.send(3, 1);
    assert.strictEqual(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });

  it(`won't accept out-of-date writes`, async () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate, memory);

    assert.strictEqual(true, await volatile1.send(3, 1));
    assert.strictEqual(false, await volatile1.send(4, 0));
    assert.strictEqual(false, await volatile1.send(4, 1));
    assert.strictEqual(false, await volatile1.send(4, 3));
    assert.strictEqual(true, await volatile1.send(4, 2));
  });

  it('will only accept a given version from one connected driver', async () => {
    const volatileKey = new VolatileStorageKey(arcId, 'unique');
    const volatile1 = new VolatileDriver<number>(volatileKey, Exists.ShouldCreate, memory);
    const recvQueue1: {model: number, version: number}[] = [];
    volatile1.registerReceiver((model: number, version: number) => recvQueue1.push({model, version}));
    const volatile2 = new VolatileDriver<number>(volatileKey, Exists.ShouldExist, memory);
    const recvQueue2: {model: number, version: number}[] = [];
    volatile2.registerReceiver((model: number, version: number) => recvQueue2.push({model, version}));

    const promise1 = volatile1.send(3, 1);
    const promise2 = volatile2.send(4, 1);

    const results = await Promise.all([promise1, promise2]);
    assert.deepEqual([true, false], results);
    assert.strictEqual(recvQueue1.length, 0);
    assert.deepEqual(recvQueue2, [{model: 3, version: 1}]);
  });
});

describe('VolatileStorageDriverProvider', () => {
  const runtime = Runtime.newForNodeTesting();

  it('supports VolatileStorageKeys for the same Arc ID', () => {
    const arc = runtime.newArc('arc', id => new VolatileStorageKey(id, 'prefix'));
    const provider = new VolatileStorageDriverProvider(arc);
    const storageKey = new VolatileStorageKey(arc.id, 'unique');
    assert.isTrue(provider.willSupport(storageKey));
  });

  it('does not support VolatileStorageKeys with a different Arc ID', () => {
    const arc = runtime.newArc('arc', id => new VolatileStorageKey(id, 'prefix'));
    const provider = new VolatileStorageDriverProvider(arc);
    const storageKey = new VolatileStorageKey(ArcId.newForTest('some-other-arc'), 'unique');
    assert.isFalse(provider.willSupport(storageKey));
  });

  it('does not support RamDiskStorageKeys', () => {
    const arc = runtime.newArc('arc', id => new VolatileStorageKey(id, 'prefix'));
    const provider = new VolatileStorageDriverProvider(arc);
    const storageKey = new RamDiskStorageKey('unique');
    assert.isFalse(provider.willSupport(storageKey));
  });

  it('uses separate memory for each arc', async () => {
    const arc1 = runtime.newArc('arc1', id => new VolatileStorageKey(id, 'prefix'));
    const arc2 = runtime.newArc('arc2', id => new VolatileStorageKey(id, 'prefix'));
    const provider1 = new VolatileStorageDriverProvider(arc1);
    const provider2 = new VolatileStorageDriverProvider(arc2);
    const storageKey1 = new VolatileStorageKey(arc1.id, 'unique');
    const storageKey2 = new VolatileStorageKey(arc2.id, 'unique');

    await provider1.driver(storageKey1, Exists.ShouldCreate);
    await provider2.driver(storageKey2, Exists.ShouldCreate);
    await assertThrowsAsync(async () => await provider1.driver(storageKey1, Exists.ShouldCreate));
    await assertThrowsAsync(async () => await provider2.driver(storageKey2, Exists.ShouldCreate));
  });
});
