/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {VersionMap} from '../../crdt/crdt.js';
import {CollectionOperation, CollectionOpTypes, CRDTCollection, CRDTCollectionTypeRecord} from '../../crdt/crdt-collection.js';
import {CRDTSingleton, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../../crdt/crdt-singleton.js';
import {IdGenerator} from '../../id.js';
import {Particle} from '../../particle.js';
import {CollectionType, EntityType, SingletonType} from '../../type.js';
import {CollectionHandle, SingletonHandle, handleNGFor} from '../handle.js';
import {StorageProxy} from '../storage-proxy.js';
import {ProxyMessageType} from '../store.js';
import {MockParticle, MockStore} from '../testing/test-storage.js';

async function getCollectionHandle(particle?: MockParticle):
    Promise<CollectionHandle<{id: string}>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const handle = handleNGFor(
      'me',
      new StorageProxy(
          'id',
          new MockStore<CRDTCollectionTypeRecord<{id: string}>>(),
          new CollectionType(EntityType.make([], {}))),
      IdGenerator.newSession(),
      fakeParticle,
      true,
      true) as CollectionHandle<{id: string}>;
  // Initialize the model.
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: {values: {}, version: {}},
    id: 1
  });
  return handle;
}

async function getSingletonHandle(particle?: MockParticle):
    Promise<SingletonHandle<{id: string}>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const handle = handleNGFor(
      'me',
      new StorageProxy(
          'id',
          new MockStore<CRDTSingletonTypeRecord<{id: string}>>(),
          new SingletonType(EntityType.make([], {}))),
      IdGenerator.newSession(),
      fakeParticle,
      true,
      true) as SingletonHandle<{id: string}>;
  // Initialize the model.
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: {values: {}, version: {}},
    id: 1
  });
  return handle;
}

describe('CollectionHandle', async () => {
  it('can add and remove elements', async () => {
    const handle = await getCollectionHandle();
    assert.isEmpty(handle.toList());
    await handle.add({id: 'A'});
    assert.sameDeepMembers(await handle.toList(), [{id: 'A'}]);
    await handle.add({id: 'B'});
    assert.sameDeepMembers(await handle.toList(), [{id: 'A'}, {id: 'B'}]);
    await handle.remove({id: 'A'});
    assert.sameDeepMembers(await handle.toList(), [{id: 'B'}]);
  });

  it('can get an element by ID', async () => {
    const handle = await getCollectionHandle();
    const entity = {id: 'A', property: 'something'};
    await handle.add(entity);
    await handle.add({id: 'B'});
    assert.deepEqual(await handle.get('A'), entity);
  });

  it('can clear', async () => {
    const handle = await getCollectionHandle();
    await handle.add({id: 'A'});
    await handle.add({id: 'B'});
    await handle.clear();
    assert.isEmpty(handle.toList());
  });

  it('can add multiple entities', async () => {
    const handle = await getCollectionHandle();
    await handle.addMultiple([{id: 'A'}, {id: 'B'}]);
    assert.sameDeepMembers(await handle.toList(), [{id: 'A'}, {id: 'B'}]);
  });

  it('notifies particle on sync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(particle);
    await handle.onSync();
    assert.isTrue(particle.onSyncCalled);
  });

  it('notifies particle on desync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(particle);
    await handle.onDesync();
    assert.isTrue(particle.onDesyncCalled);
  });

  it('notifies particle of updates', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(particle);
    const op: CollectionOperation<{id: string}> = {
      type: CollectionOpTypes.Remove,
      removed: {id: 'id'},
      actor: 'actor',
      clock: {'actor': 1}
    };
    await handle.onUpdate(op, new Set(), {'actor': 1, 'other': 2});
    assert.deepEqual(
        particle.lastUpdate, {removed: {id: 'id'}, originator: false});
  });

  it('notifies particle of fast forward ops', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(particle);
    const op: CollectionOperation<{id: string}> = {
      type: CollectionOpTypes.FastForward,
      added: [],
      removed: [{id: 'id'}],
      oldClock: {'actor': 1},
      newClock: {'actor': 1}
    };
    await handle.onUpdate(op, new Set(), {'actor': 1, 'other': 2});
    assert.isTrue(particle.onSyncCalled);
  });

  it('stores new version map', async () => {
    const handle = await getCollectionHandle();

    const versionMap: VersionMap = {'actor': 1, 'other': 2};
    // Make storageProxy return the defined version map.
    handle.storageProxy.getParticleView = async () => {
      return Promise.resolve([new Set(), versionMap]);
    };

    // This will pull in the version map above.
    await handle.toList();
    // Swap out storageProxy.applyOp to check the updated clock is passed in the next op.
    let capturedClock: VersionMap;
    handle.storageProxy.applyOp = async (op: CollectionOperation<{id: string}>) => {
      capturedClock = 'clock' in op ? op.clock : null;
      return true;
    };
    // Use an op that does not increment the clock.
    await handle.remove({id: 'id'});
    assert.deepEqual(capturedClock, versionMap);
  });

  it('can override default options', async () => {
    const handle = await getCollectionHandle();
    assert.deepEqual(handle.options, {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    });
    handle.configure({notifyDesync: true, notifySync: false});
    assert.deepEqual(handle.options, {
      keepSynced: true,
      notifySync: false,
      notifyUpdate: true,
      notifyDesync: true,
    });
  });
});

describe('SingletonHandle', async () => {
  it('can set and clear elements', async () => {
    const handle = await getSingletonHandle();
    assert.strictEqual(await handle.get(), null);
    await handle.set({id: 'A'});
    assert.deepEqual(await handle.get(), {id: 'A'});
    await handle.set({id: 'B'});
    assert.deepEqual(await handle.get(), {id: 'B'});
    await handle.clear();
    assert.strictEqual(await handle.get(), null);
  });

  it('notifies particle on sync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(particle);
    await handle.onSync();
    assert.isTrue(particle.onSyncCalled);
  });

  it('notifies particle on desync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(particle);
    await handle.onDesync();
    assert.isTrue(particle.onDesyncCalled);
  });

  it('notifies particle of updates', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(particle);
    const op: SingletonOperation<{id: string}> = {
      type: SingletonOpTypes.Set,
      value: {id: 'id'},
      actor: 'actor',
      clock: {'actor': 1}
    };
    await handle.onUpdate(op, {id: 'old'}, {'actor': 1, 'other': 2});
    assert.deepEqual(
        particle.lastUpdate,
        {data: {id: 'id'}, oldData: {id: 'old'}, originator: false});
  });

  it('stores new version map', async () => {
    const handle = await getSingletonHandle();

    const versionMap: VersionMap = {'actor': 1, 'other': 2};
    // Make storageProxy return the defined version map.
    handle.storageProxy.getParticleView = async () => {
      return Promise.resolve([{id: 'id'}, versionMap]);
    };

    // This will pull in the version map above.
    await handle.get();
    // Swap out storageProxy.applyOp to check the updated clock is passed in the next op.
    let capturedClock;
    handle.storageProxy.applyOp = async (op: SingletonOperation<{id: string}>) => {
      capturedClock = op.clock;
      return true;
    };
    // Use an op that does not increment the clock.
    await handle.clear();
    assert.deepEqual(capturedClock, versionMap);
  });
});
