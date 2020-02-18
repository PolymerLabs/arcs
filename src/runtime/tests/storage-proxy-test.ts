/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {assert} from '../../platform/chai-web.js';
import {handleFor, HandleOld, Singleton, Collection} from '../handle.js';
import {ArcId, IdGenerator} from '../id.js';
import {Schema} from '../schema.js';
import {StorageProxy, StorageProxyScheduler, CollectionProxy, BigCollectionProxy, SingletonProxy, NoOpStorageProxy} from '../storage-proxy.js';
import {CrdtCollectionModel} from '../storage/crdt-collection-model.js';
import {VolatileStorage} from '../storage/volatile-storage.js';
import {EntityType} from '../type.js';
import {Entity} from '../entity.js';
import {Particle} from '../particle.js';
import {floatingPromiseToAudit} from '../util.js';

const CAN_READ = true;
const CAN_WRITE = true;

// Test version of VolatileSingleton.
class TestSingleton {
  type;
  name: string;
  _stored = null;
  _version = 0;
  _listeners = [];

  constructor(type, name: string) {
    this.type = type;
    this.name = name;
  }

  attachListener(callback) {
    this._listeners.push(callback);
  }

  get() {
    return this._stored;
  }

  modelForSynchronization() {
    let model = [];
    if (this._stored) {
      model = [{id: this._stored.id, value: this._stored}];
    }
    return {model, version: this._version};
  }

  // For both set and clear:
  //  sendEvent: if true, send an update event to attached listeners.
  //  version: optionally override the current version being incremented.

  set(entity, {sendEvent = true, version = undefined, originatorId=null, barrier=null} = {}) {
    this._stored = entity ? {id: Entity.id(entity), rawData: Entity.toLiteral(entity)} : null;
    this._version = (version !== undefined) ? version : this._version + 1;
    if (sendEvent) {
      const event = {data: this._stored, version: this._version, originatorId, barrier};
      this._listeners.forEach(cb => cb(event));
    }
  }

  clear({sendEvent = true, version = undefined, originatorId=null} = {}) {
    this.set(null, {sendEvent, version, originatorId});
  }
}

// Test version of VolatileCollection.
class TestCollection {
  type;
  name;
  _model = new CrdtCollectionModel();
  _version = 0;
  _listeners = [];
  _nextKey = 0;
  _arcId;

  constructor(type, name, arcId) {
    this.type = type;
    this.name = name;
    this._arcId = arcId;
  }

  attachListener(callback) {
    this._listeners.push(callback);
  }

  toList() {
    return this._model.toList();
  }

  modelForSynchronization() {
    return {model: this._model.toLiteral(), version: this._version};
  }

  // For both store and remove:
  //  sendEvent: if true, send an update event to attached listeners.
  //  version: optionally override the current version being incremented.

  store(id, entity, {sendEvent = true, version = undefined, originatorId=null, keys = null} = {}) {
    const entry = {id, rawData: Entity.toLiteral(entity)};
    if (keys == null) {
      keys = [`key${this._nextKey++}`];
    }
    const effective = this._model.add(id, entry, keys);
    this._version = (version !== undefined) ? version : this._version + 1;
    if (sendEvent) {
      const item = {value: entry, effective, keys};
      const event = {add: [item], version: this._version, originatorId};
      this._listeners.forEach(cb => cb(event));
    }
  }

  remove(id, {sendEvent = true, version = undefined, originatorId=null, keys=[]} = {}) {
    const entry = this._model.getValue(id);
    assert.notStrictEqual(entry, undefined,
           `Test bug: attempt to remove non-existent id '${id}' from '${this.name}'`);
    if (keys.length === 0) {
      keys = this._model.getKeys(id);
    }
    const effective = this._model.remove(id, keys);
    this._version = (version !== undefined) ? version : this._version + 1;
    if (sendEvent) {
      const item = {value: {id, storageKey: `volatile://${this._arcId}^^volatile-Thing {Text value}`}, effective, keys};
      // Hard coding the storageKey here is a bit cheeky, but the TestEngine class
      // enforces the schema and arcID is plumbed through.
      const event = {remove: [item], version: this._version, originatorId};
      this._listeners.forEach(cb => cb(event));
    }
  }
}

// Inner-PEC test particle; reports events back to the TestEngine.
class TestParticle {
  id;
  _report;

  constructor(id, report) {
    this.id = id;
    this._report = report;
  }

  callOnHandleSync(handle, model) {
    this._report(['onHandleSync', this.id, handle.name, this._toString(model)].join(':'));
  }

  callOnHandleUpdate(handle, update) {
    let details = '';
    if ('data' in update) {
      details += this._toString(update.data);
    }
    if ('added' in update) {
      details += '+' + this._toString(update.added);
    }
    if ('removed' in update) {
      details += '-' + this._toString(update.removed);
    }
    if (update.originator) {
      details += '(originator)';
    }
    this._report(['onHandleUpdate', this.id, handle.name, details].join(':'));
  }

  callOnHandleDesync(handle) {
    this._report(['onHandleDesync', this.id, handle.name].join(':'));
  }

  _toString(item) {
    if (item === null || item === undefined) {
      return '(' + item + ')';
    }
    if (Array.isArray(item)) {
      return '[' + item.map(v => v.value).join('|') + ']';
    }
    return item.value;
  }
}

class TestEngine {
  schema = new Schema(['Thing'], {value: 'Text'});
  type = new EntityType(this.schema);
  _idCounters = [1, 1, 1]; // particle, proxy, entity
  _stores = new Map();
  _syncCallbacks = new Map();
  _events = [];
  _scheduler = new StorageProxyScheduler();
  _arcId: ArcId;
  _idGenerator = IdGenerator.newSession();

  constructor(arcId: string) {
    this._arcId = ArcId.newForTest(arcId);
  }

  newSingleton(name) {
    const store = new TestSingleton(this.type, name);
    this._stores.set(name, store);
    return store;
  }

  newCollection(name) {
    // arcId is required to correctly generate remove events, as the arcId
    // is part of the storageKey used by references.
    const store = new TestCollection(this.type.collectionOf(), name, this._arcId);
    this._stores.set(name, store);
    return store;
  }

  newParticle(): Particle {
    return new TestParticle('P' + this._idCounters[0]++, x => this._events.push(x)) as unknown as Particle;
  }

  newProxy(store): CollectionProxy | BigCollectionProxy | SingletonProxy {
    // tslint:disable-next-line: no-any
    const fakePec: any = {idGenerator: this._idGenerator};
    // tslint:disable-next-line: no-any
    return StorageProxy.newProxy('X' + this._idCounters[1]++, store.type, this as any, fakePec, this._scheduler, store.name);
  }

  newNoOpProxy(store): NoOpStorageProxy {
    return StorageProxy.newNoOpProxy(store.id, store.type);
  }

  newHandle(store, proxy, particle, canRead, canWrite): HandleOld {
    return handleFor(proxy, this._idGenerator, store.name, particle.id, canRead, canWrite);
  }

  newEntity(value): Entity {
    const entity = new (Entity.createEntityClass(this.schema, null))({value});
    Entity.identify(entity, 'E' + this._idCounters[2]++, null);
    return entity;
  }

  async verifySubsequence(...expected) {
    await this._scheduler.idle;
    const found = [];
    for (let expectedI = 0, eventI = 0; expectedI < expected.length && eventI < this._events.length;) {
      if (expected[expectedI] === this._events[eventI]) {
        found.push(expected[expectedI]);
        expectedI++;
        eventI++;
      } else {
        eventI++;
      }
    }
    assert.sameOrderedMembers(found, expected);
    for (const expectation of expected) {
      const i = this._events.indexOf(expectation);
      this._events.splice(i, 1);
    }
  }

  async verify(...expected) {
    await this._scheduler.idle;
    assert.sameOrderedMembers(this._events, expected);
    this._events = [];
  }

  InitializeProxy(handle, callback) {
    const store = this._stores.get(handle.name);
    assert.isDefined(store);
    store.attachListener(callback);
    this._events.push('InitializeProxy:' + handle.name);
  }

  SynchronizeProxy(handle, callback) {
    if (!this._syncCallbacks.has(handle.name)) {
      this._syncCallbacks.set(handle.name, []);
    }
    this._syncCallbacks.get(handle.name).push(callback);
    this._events.push('SynchronizeProxy:' + handle.name);
  }

  // `data` is optional; if not provided, the model will be retrieved from `store`.
  sendSync(store, data?) {
    const callbacks = this._syncCallbacks.get(store.name);
    assert(callbacks !== undefined && callbacks.length > 0,
           `Test bug: attempt to send sync response with no sync request for '${store.name}'`);
    if (data === undefined) {
      data = store.modelForSynchronization();
    }
    callbacks.shift()(data);
  }

  HandleGet(handle, callback) {
    this._events.push('HandleGet:' + handle.name);
  }

  HandleToList(handle, callback) {
    this._events.push('HandleToList:' + handle.name);
  }

  HandleSet(handle, data) {
    this._events.push('HandleSet:' + handle.name + ':' + data.rawData.value);
  }

  HandleStore(handle, callback, data) {
    this._events.push('HandleStore:' + handle.name + ':' + data.value.rawData.value);
  }

  HandleClear(handle) {
    this._events.push('HandleClear:' + handle.name);
  }

  HandleRemove(handle, callback, data) {
    this._events.push('HandleRemove:' + handle.name + ':' + data.id);
  }
}

// TODO: test handles with different types observing the same proxy
// TODO: test with handles changing config options over time
describe('storage-proxy', () => {
  it('notifies for updates to initially empty handles', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, !CAN_WRITE);
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE);

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                        'InitializeProxy:bar', 'SynchronizeProxy:bar',
                        'onHandleSync:P1:foo:(null)', 'onHandleSync:P1:bar:[]');

    fooStore.set(engine.newEntity('oh'));
    barStore.store('i1', engine.newEntity('hai'));
    await engine.verify('onHandleUpdate:P1:foo:oh', 'onHandleUpdate:P1:bar:+[hai]');

    fooStore.clear();
    barStore.remove('i1');
    await engine.verify('onHandleUpdate:P1:foo:(null)', 'onHandleUpdate:P1:bar:-[hai]');
  });

  it('notifies for updates to initially populated handles', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, CAN_WRITE);
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, !CAN_WRITE);

    fooStore.set(engine.newEntity('well'));
    barStore.store('i1', engine.newEntity('hi'));
    barStore.store('i2', engine.newEntity('there'));

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                        'InitializeProxy:bar', 'SynchronizeProxy:bar',
                        'onHandleSync:P1:foo:well', 'onHandleSync:P1:bar:[hi|there]');

    fooStore.set(engine.newEntity('gday'));
    barStore.store('i3', engine.newEntity('mate'));
    await engine.verify('onHandleUpdate:P1:foo:gday', 'onHandleUpdate:P1:bar:+[mate]');

    fooStore.clear();
    barStore.remove('i2');
    await engine.verify('onHandleUpdate:P1:foo:(null)', 'onHandleUpdate:P1:bar:-[there]');
  });

  it('handles dropped updates on a Singleton with immediate resync', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, !CAN_WRITE);

    fooHandle.configure({notifyDesync: true});
    fooProxy.register(particle, fooHandle);
    engine.sendSync(fooStore);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo', 'onHandleSync:P1:foo:(null)');

    // Drop event 2; desync is triggered by v3.
    fooStore.set(engine.newEntity('v1'));
    fooStore.set(engine.newEntity('v2'), {sendEvent: false});
    fooStore.set(engine.newEntity('v3'));
    await engine.verifySubsequence('SynchronizeProxy:foo');
    await engine.verify('onHandleUpdate:P1:foo:v1', 'onHandleDesync:P1:foo');

    engine.sendSync(fooStore);
    await engine.verify('onHandleSync:P1:foo:v3');
  });

  it('handles dropped updates on a Collection with immediate resync', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, !CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:P1:bar:[]');

    // Drop event 2; desync is triggered by v3.
    barStore.store('i1', engine.newEntity('v1'));
    barStore.store('i2', engine.newEntity('v2'), {sendEvent: false});
    barStore.store('i3', engine.newEntity('v3'));
    await engine.verifySubsequence('SynchronizeProxy:bar');
    await engine.verify('onHandleUpdate:P1:bar:+[v1]', 'onHandleDesync:P1:bar');

    engine.sendSync(barStore);
    await engine.verify('onHandleSync:P1:bar:[v1|v2|v3]');
  });

  it('handles dropped updates on a Collection with delayed resync', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:P1:bar:[]');

    // Drop event 2; desync is triggered by v3.
    barStore.store('i1', engine.newEntity('v1'));
    barStore.store('i2', engine.newEntity('v2'), {sendEvent: false});
    barStore.store('i3', engine.newEntity('v3'));
    await engine.verifySubsequence('SynchronizeProxy:bar');
    await engine.verify('onHandleUpdate:P1:bar:+[v1]', 'onHandleDesync:P1:bar');

    // Delay both the SynchronizeProxy request and response, such that the request arrives
    // when the storage object is at v5 and the response arrives at the proxy after the v6
    // and v7 updates have been sent:
    //   v1 (v2) v3 <desync> v4 v5 <resync-request> v6 v7 <resync-response>
    barStore.store('i4', engine.newEntity('v4'));
    barStore.store('i5', engine.newEntity('v5'));
    const v5Data = barStore.modelForSynchronization();
    barStore.store('i6', engine.newEntity('v6'));
    barStore.remove('i1');
    engine.sendSync(barStore, v5Data);
    await engine.verify('onHandleSync:P1:bar:[v1|v2|v3|v4|v5]',
                        'onHandleUpdate:P1:bar:+[v6]',
                        'onHandleUpdate:P1:bar:-[v1]');
  });

  it('handles misordered updates on a Collection', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:P1:bar:[]');

    barStore.store('i1', engine.newEntity('v1'), {version: 1});
    barStore.store('i4', engine.newEntity('v4'), {version: 4});
    barStore.store('i3', engine.newEntity('v3'), {version: 3});
    barStore.store('i2', engine.newEntity('v2'), {version: 2});
    barStore.store('i5', engine.newEntity('v5'), {version: 5});

    // Desync is triggered, but the resync message is ignored because the updates
    // "catch up" before the resync arrives.
    await engine.verify(
      'SynchronizeProxy:bar',
      'onHandleUpdate:P1:bar:+[v1]',
      'onHandleDesync:P1:bar',
      'onHandleUpdate:P1:bar:+[v2]',
      'onHandleUpdate:P1:bar:+[v3]',
      'onHandleUpdate:P1:bar:+[v4]',
      'onHandleUpdate:P1:bar:+[v5]');
  });

  it('sends update notifications with non-synced handles', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, CAN_WRITE);
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, !CAN_WRITE);

    fooHandle.configure({keepSynced: false, notifyUpdate: true});
    barHandle.configure({keepSynced: false, notifyUpdate: true});
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    // Listeners are attached, but no initial sync requests are sent.
    await engine.verify('InitializeProxy:foo', 'InitializeProxy:bar');

    // Updates are sent.
    fooStore.set(engine.newEntity('v1'));
    barStore.store('i1', engine.newEntity('v1'));
    await engine.verify('onHandleUpdate:P1:foo:v1', 'onHandleUpdate:P1:bar:+[v1]');

    // Desync events ignored, resync events are just updates.
    fooStore.set(engine.newEntity('v2'), {sendEvent: false});
    fooStore.set(engine.newEntity('v3'));
    barStore.store('i2', engine.newEntity('v2'), {sendEvent: false});
    barStore.store('i3', engine.newEntity('v3'));
    await engine.verify('onHandleUpdate:P1:foo:v3', 'onHandleUpdate:P1:bar:+[v3]');
  });

  it('non-readable handles are never synced', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, !CAN_READ, CAN_WRITE) as Singleton;
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, !CAN_READ, CAN_WRITE) as Collection;

    // No InitializeProxy or SynchronizeProxy calls.
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    await engine.verify();

    // All write calls go through to the backing store.
    await fooHandle.set(engine.newEntity('abc'));
    await fooHandle.clear();
    await engine.verify('HandleSet:foo:abc', 'HandleClear:foo');

    const entity = engine.newEntity('def');
    await barHandle.store(entity);
    await barHandle.remove(entity);
    await engine.verify('HandleStore:bar:def', 'HandleRemove:bar:' + Entity.id(entity));
  });

  it('reading from a synced proxy should not call the backing store', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, !CAN_WRITE) as Singleton;
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, !CAN_WRITE) as Collection;

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                        'InitializeProxy:bar', 'SynchronizeProxy:bar',
                        'onHandleSync:P1:foo:(null)', 'onHandleSync:P1:bar:[]');

    // Reading should return the local copy and not call the backing store.
    await fooHandle.fetch();
    await barHandle.toList();
    await engine.verify(); // no HandleGet or HandleToList
  });

  it('reading from a desynced proxy should call the backing store', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, CAN_WRITE) as Singleton;
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE) as Collection;

    // Don't send the initial sync responses so the proxies stay desynchronized.
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                        'InitializeProxy:bar', 'SynchronizeProxy:bar');

    // Reading should call through to the backing store.
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit(fooHandle.fetch());
    floatingPromiseToAudit(barHandle.toList());
    await engine.verify('HandleGet:foo', 'HandleToList:bar');
  });

  it('reading from a non-syncing proxy should call the backing store', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, CAN_WRITE) as Singleton;
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE) as Collection;

    fooHandle.configure({keepSynced: false});
    barHandle.configure({keepSynced: false});
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    await engine.verify('InitializeProxy:foo', 'InitializeProxy:bar');

    // Reading should call through to the backing store.
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit(fooHandle.fetch());
    floatingPromiseToAudit(barHandle.toList());
    await engine.verify('HandleGet:foo', 'HandleToList:bar');
  });

  it('does not notify about redundant concurrent operations (collection)', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const particle = engine.newParticle();
    const barProxy = engine.newProxy(barStore);
    const barHandle = engine.newHandle(barStore, barProxy, particle, CAN_READ, CAN_WRITE);
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    await engine.verify(
        'InitializeProxy:bar',
        'SynchronizeProxy:bar',
        'onHandleSync:P1:bar:[]');

    const v1 = engine.newEntity('v1');
    barStore.store(Entity.id(v1), v1, {keys: ['0']});
    barStore.store(Entity.id(v1), v1, {keys: ['1']});

    // Although we sent two adds, there is only one notfication.
    await engine.verify('onHandleUpdate:P1:bar:+[v1]');

    // Removing key '0' leaves '1'.
    barStore.remove(Entity.id(v1), {keys: ['0']});
    await engine.verify();

    // Removing the last key will cause a notify to the particle
    barStore.remove(Entity.id(v1), {keys: ['1']});
    await engine.verify('onHandleUpdate:P1:bar:-[v1]');
  });

  it('does not desync on a write when synchronized (singleton)', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const particle = engine.newParticle();
    const fooProxy = engine.newProxy(fooStore);
    const fooHandle = engine.newHandle(fooStore, fooProxy, particle, CAN_READ, CAN_WRITE) as Singleton;

    // Set up sync with an initial value.
    fooStore.set(engine.newEntity('start'));
    fooProxy.register(particle, fooHandle);
    engine.sendSync(fooStore);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo', 'onHandleSync:P1:foo:start');

    // Reading the inner-pec handle should return the local copy and not call the backing store.
    await fooHandle.fetch();
    await engine.verify();

    // Write to handle modifies the model directly, dispatches update and store write.
    const changed = engine.newEntity('changed');
    await fooHandle.set(changed);
    await engine.verifySubsequence('onHandleUpdate:P1:foo:changed');
    await engine.verify('HandleSet:foo:changed');

    // Read the handle again; the read should still be able to complete locally.
    await fooHandle.fetch();
    await engine.verify();

    // Update the backing store with a concurrent write. This should not surface
    // in the handle.
    fooStore.set(engine.newEntity('concurrent'));
    await engine.verify();

    // Commit the change to the backing store, and reflect the barrier.
    fooStore.set(changed, {barrier: fooProxy['barrier']});
    await engine.verify();

    // Subsequent updates should be visible in the handle.
    fooStore.set(engine.newEntity('subsequent'));
    await engine.verify('onHandleUpdate:P1:foo:subsequent');
  });

  it('multiple particles observing one proxy', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const barProxy = engine.newProxy(barStore);

    const particle1 = engine.newParticle();
    const particle2 = engine.newParticle();
    const particle3 = engine.newParticle();
    const barHandle1 = engine.newHandle(barStore, barProxy, particle1, CAN_READ, !CAN_WRITE);
    const barHandle2 = engine.newHandle(barStore, barProxy, particle2, CAN_READ, CAN_WRITE);
    const barHandle3 = engine.newHandle(barStore, barProxy, particle3, !CAN_READ, CAN_WRITE);

    // barHandle3 is not readable so it cannot be configured and should not receive any events.
    barHandle1.configure({notifyDesync: true});
    barHandle2.configure({notifyDesync: true});

    barProxy.register(particle1, barHandle1);
    barProxy.register(particle2, barHandle2);
    barProxy.register(particle3, barHandle3);
    engine.sendSync(barStore);

    await engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar',
                        'onHandleSync:P1:bar:[]', 'onHandleSync:P2:bar:[]');

    // Drop event 2; desync is triggered by v3.
    barStore.store('i1', engine.newEntity('v1'));
    barStore.store('i2', engine.newEntity('v2'), {sendEvent: false});
    barStore.store('i3', engine.newEntity('v3'));

    await engine.verifySubsequence('SynchronizeProxy:bar');
    await engine.verifySubsequence('onHandleUpdate:P1:bar:+[v1]', 'onHandleUpdate:P2:bar:+[v1]');
    await engine.verify('onHandleDesync:P1:bar', 'onHandleDesync:P2:bar');

    engine.sendSync(barStore);
    await engine.verify('onHandleSync:P1:bar:[v1|v2|v3]', 'onHandleSync:P2:bar:[v1|v2|v3]');
  });

  it('multiple particles registering at different times', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const fooProxy = engine.newProxy(fooStore);

    const particle1 = engine.newParticle();
    const particle2 = engine.newParticle();
    const fooHandle1 = engine.newHandle(fooStore, fooProxy, particle1, CAN_READ, !CAN_WRITE);
    const fooHandle2 = engine.newHandle(fooStore, fooProxy, particle2, CAN_READ, CAN_WRITE);

    fooStore.set(engine.newEntity('Huey'));
    fooProxy.register(particle1, fooHandle1);
    engine.sendSync(fooStore);
    fooProxy.register(particle2, fooHandle2);
    await engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                        'onHandleSync:P1:foo:Huey', 'onHandleSync:P2:foo:Huey');

    fooStore.set(engine.newEntity('Dewey'));
    await engine.verify('onHandleUpdate:P1:foo:Dewey', 'onHandleUpdate:P2:foo:Dewey');

    const particle3 = engine.newParticle();
    const fooHandle3 = engine.newHandle(fooStore, fooProxy, particle3, CAN_READ, CAN_WRITE);
    fooProxy.register(particle3, fooHandle3);
    await engine.verify('onHandleSync:P3:foo:Dewey');

    fooStore.set(engine.newEntity('Louie'));
    await engine.verify('onHandleUpdate:P1:foo:Louie', 'onHandleUpdate:P2:foo:Louie',
                        'onHandleUpdate:P3:foo:Louie');
  });

  it('multiple particles with different handle configurations', async () => {
    const engine = new TestEngine('arc-id');
    const fooStore = engine.newSingleton('foo');
    const fooProxy = engine.newProxy(fooStore);

    // First handle: configured for no sync and no events
    const particle1 = engine.newParticle();
    const fooHandle1 = engine.newHandle(fooStore, fooProxy, particle1, CAN_READ, !CAN_WRITE);
    fooHandle1.configure({keepSynced: false, notifySync: false, notifyUpdate: false});
    fooProxy.register(particle1, fooHandle1);
    fooStore.set(engine.newEntity('x'));
    await engine.verify('InitializeProxy:foo'); // attaches listener, no sync request, no update event

    // Second handle: configured for updates
    const particle2 = engine.newParticle();
    const fooHandle2 = engine.newHandle(fooStore, fooProxy, particle2, CAN_READ, !CAN_WRITE);
    fooHandle2.configure({keepSynced: false, notifySync: false, notifyUpdate: true});
    fooProxy.register(particle2, fooHandle2);
    fooStore.set(engine.newEntity('y'));
    await engine.verify('onHandleUpdate:P2:foo:y');

    // Third handle: configured for sync but no updates
    const particle3 = engine.newParticle();
    const fooHandle3 = engine.newHandle(fooStore, fooProxy, particle3, CAN_READ, !CAN_WRITE);
    fooHandle3.configure({keepSynced: true, notifySync: true, notifyUpdate: false});
    fooProxy.register(particle3, fooHandle3);
    engine.sendSync(fooStore);
    fooStore.set(engine.newEntity('z'));
    await engine.verify('SynchronizeProxy:foo', 'onHandleSync:P3:foo:y', 'onHandleUpdate:P2:foo:z');
  });

  it('delivers the originator status to the originating particle', async () => {
    const engine = new TestEngine('arc-id');
    const barStore = engine.newCollection('bar');
    const barProxy = engine.newProxy(barStore);

    const particle1 = engine.newParticle();
    const particle2 = engine.newParticle();
    const barHandle1 = engine.newHandle(barStore, barProxy, particle1, CAN_READ, CAN_WRITE) as Collection;
    const barHandle2 = engine.newHandle(barStore, barProxy, particle2, CAN_READ, CAN_WRITE) as Collection;

    barProxy.register(particle1, barHandle1);
    barProxy.register(particle2, barHandle2);
    engine.sendSync(barStore);

    await engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar',
                        'onHandleSync:P1:bar:[]', 'onHandleSync:P2:bar:[]');

    const v1 = engine.newEntity('v1');
    await barHandle1.store(v1);

    await engine.verifySubsequence('onHandleUpdate:P1:bar:+[v1](originator)');
    await engine.verifySubsequence('onHandleUpdate:P2:bar:+[v1]');
    await engine.verify('HandleStore:bar:v1');

    const v2 = engine.newEntity('v2');
    await barHandle2.store(v2);

    await engine.verifySubsequence('onHandleUpdate:P1:bar:+[v2]');
    await engine.verifySubsequence('onHandleUpdate:P2:bar:+[v2](originator)');
    await engine.verify('HandleStore:bar:v2');
  });

  it('ensures NoOpStorageProxy overrides all methods', async () => {
    const engine = new TestEngine('arc-id');
    const fooProxy = engine.newProxy({type: engine.type, name: 'foo'});

    const properties = [];
    let proto = Object.getPrototypeOf(fooProxy);
    while (proto && proto !== Object.prototype) {
      Object.getOwnPropertyNames(proto).forEach(name => {
        const desc = Object.getOwnPropertyDescriptor(proto, name);
        if (desc && typeof desc.value === 'function') {
          properties.push(name);
        }
      });
      proto = Object.getPrototypeOf(proto);
    }

    const noOpProxy = engine.newNoOpProxy({id: 'test', type: engine.type});
    const noOpProperties = Object.getOwnPropertyNames(Object.getPrototypeOf(noOpProxy));

    properties.forEach(property => {
      assert(noOpProperties.indexOf(property) !== -1);
    });
  });
});
