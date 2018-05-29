/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from './chai-web.js';
import {Schema} from '../schema.js';
import {Type} from '../type.js';
import {StorageProxy} from '../storage-proxy.js';
import {handleFor} from '../handle.js';
import {InMemoryStorage} from '../storage/in-memory-storage.js';

const CAN_READ = true, CAN_WRITE = true;

// Test version of InMemoryVariable.
class TestVariable {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this._stored = null;
    this._version = 0;
  }

  get() {
    return this._stored;
  }

  getWithVersion() {
    return {data: this._stored, version: this._version};
  }

  // `version` is optional; if not provided, current version is incremented.
  // Returns the event that would usually be sent to any attached listeners.
  set(entity, version) {
    this._stored = entity;
    this._version = (version !== undefined) ? version : this._version + 1;
    return {data: this._stored, version: this._version};
  }

  clear(version) {
    return this.set(null, version);
  }
}

// Test version of InMemoryCollection.
class TestCollection {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this._items = new Map();
    this._version = 0;
  }

  toList() {
    return [...this._items.values()];
  }

  toListWithVersion() {
    return {list: [...this._items.values()], version: this._version};
  }

  // `version` is optional; if not provided, current version is incremented.
  // Returns the event that would usually be sent to any attached listeners.
  store(id, entity, version) {
    let entry = {id, rawData: entity.rawData};
    this._items.set(id, entry);
    this._version = (version !== undefined) ? version : this._version + 1;
    return {add: [entry], version: this._version};
  }

  remove(id, version) {
    let entry = this._items.get(id);
    assert(entry !== undefined,
           `Test bug: attempt to remove non-existent id '${id}' from '${this.name}'`);
    this._items.delete(id);
    this._version = (version !== undefined) ? version : this._version + 1;
    return {remove: [entry], version: this._version};
  }
}

// Inner-PEC test particle; reports events back to the TestEngine.
class TestParticle {
  constructor(id, report) {
    this.id = id;
    this._report = report;
  }

  onHandleSync(handle, model, version) {
    this._report(['onHandleSync', handle.name, version, this._toString(model)].join(':'));
  }

  onHandleUpdate(handle, update, version) {
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
    this._report(['onHandleUpdate', handle.name, version, details].join(':'));
  }

  onHandleDesync(handle, version) {
    this._report(['onHandleDesync', handle.name, version].join(':'));
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
  constructor() {
    this.schema = new Schema({names: ['Thing'], fields: {value: 'Text'}});
    this.type = Type.newEntity(this.schema);
    this._idCounter = 0;
    this._listeners = new Map();
    this._syncCallbacks = new Map();
    this._events = [];
  }

  newVariable(name) {
    return new TestVariable(this.type, name);
  }

  newCollection(name) {
    return new TestCollection(this.type.collectionOf(), name);
  }

  newParticle() {
    return new TestParticle('P' + this._idCounter++, x => this._events.push(x));
  }

  newProxy(store, particle, canRead, canWrite) {
    let proxy = new StorageProxy('X' + this._idCounter++, store.type, this, {}, store.name);
    let handle = handleFor(proxy, store.type.isCollection, store.name, particle.id, canRead, canWrite);
    handle.entityClass = this.schema.entityClass();
    return [proxy, handle];
  }

  newEntity(value) {
    let entity = new (this.schema.entityClass())({value});
    entity.identify('E' + this._idCounter++);
    return entity;
  }

  verify(...expected) {
    assert.deepEqual(this._events, expected);
    this._events = [];
  }

  InitializeProxy({handle, callback}) {
    this._listeners.set(handle.name, callback);
    this._events.push('InitializeProxy:' + handle.name);
  }

  SynchronizeProxy({handle, callback}) {
    if (this._syncCallbacks.get(handle.name) === undefined) {
      this._syncCallbacks.set(handle.name, []);
    }
    this._syncCallbacks.get(handle.name).push(callback);
    this._events.push('SynchronizeProxy:' + handle.name);
  }

  // `data` is optional; if not provided, the model will be retrieved from store.
  sendSync(store, data) {
    let callbacks = this._syncCallbacks.get(store.name);
    assert(callbacks !== undefined && callbacks.length > 0,
           `Test bug: attempt to send sync response with no sync request for '${store.name}'`);
    if (data === undefined) {
      if (store.toListWithVersion) {
        data = store.toListWithVersion();
      } else {
        data = store.getWithVersion();
      }
    }
    callbacks.shift()(data);
  }

  sendUpdate(store, update) {
    let callback = this._listeners.get(store.name);
    assert.isDefined(callback);
    callback(update);
  }

  HandleGet({handle, callback}) {
    this._events.push('HandleGet:' + handle.name);
  }

  HandleToList({handle, callback}) {
    this._events.push('HandleToList:' + handle.name);
  }

  HandleSet({handle, data}) {
    this._events.push('HandleSet:' + handle.name + ':' + data.rawData.value);
  }

  HandleStore({handle, data}) {
    this._events.push('HandleStore:' + handle.name + ':' + data.rawData.value);
  }

  HandleClear({handle}) {
    this._events.push('HandleClear:' + handle.name);
  }

  HandleRemove({handle, data}) {
    this._events.push('HandleRemove:' + handle.name + ':' + data); // data = id
  }
}

// TODO: multi-particle tests
// TODO: test with handles changing config options over time
describe('storage-proxy', function() {
  it('verify that test storage events match real storage events', async function() {
    // If this fails, most likely the InMemoryStorage classes have been changed
    // and TestVariable/TestCollection will need to be updated to match.
    let engine = new TestEngine();
    let entity = engine.newEntity('abc');
    let realStorage = new InMemoryStorage('arc-id');
    let testDetails, realDetails;

    let testVariable = engine.newVariable('v');
    let realVariable = await realStorage.construct('vid', engine.type, 'in-memory');
    realVariable._fire = (kind, details) => realDetails = details;

    testDetails = testVariable.set(entity, 1);
    await realVariable.set(entity);
    assert.equal(JSON.stringify(testDetails), JSON.stringify(realDetails));

    testDetails = testVariable.clear(2);
    await realVariable.clear();
    assert.equal(JSON.stringify(testDetails), JSON.stringify(realDetails));

    let testCollection = engine.newCollection('c');
    let realCollection = await realStorage.construct('cid', engine.type.collectionOf(), 'in-memory');
    realCollection._fire = (kind, details) => realDetails = details;

    testDetails = testCollection.store('id1', entity, 1);
    await realCollection.store({id: 'id1', rawData: {value: 'abc'}});
    assert.equal(JSON.stringify(testDetails), JSON.stringify(realDetails));

    testDetails = testCollection.remove('id1', 2);
    await realCollection.remove('id1');
    assert.equal(JSON.stringify(testDetails), JSON.stringify(realDetails));
  });

  it('notifies for updates to initially empty handles', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, !CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, CAN_WRITE);

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                  'InitializeProxy:bar', 'SynchronizeProxy:bar',
                  'onHandleSync:foo:0:(null)', 'onHandleSync:bar:0:[]');

    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('oh')));
    engine.sendUpdate(barStore, barStore.store('i1', engine.newEntity('hai')));
    engine.verify('onHandleUpdate:foo:1:oh', 'onHandleUpdate:bar:1:+[hai]');

    engine.sendUpdate(fooStore, fooStore.clear());
    engine.sendUpdate(barStore, barStore.remove('i1'));
    engine.verify('onHandleUpdate:foo:2:(null)', 'onHandleUpdate:bar:2:-[hai]');
  });

  it('notifies for updates to initially populated handles', async () => {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, !CAN_WRITE);

    fooStore.set(engine.newEntity('well'));
    barStore.store('i1', engine.newEntity('hi'));
    barStore.store('i2', engine.newEntity('there'));

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                  'InitializeProxy:bar', 'SynchronizeProxy:bar',
                  'onHandleSync:foo:1:well', 'onHandleSync:bar:2:[hi|there]');

    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('gday')));
    engine.sendUpdate(barStore, barStore.store('i3', engine.newEntity('mate')));
    engine.verify('onHandleUpdate:foo:2:gday', 'onHandleUpdate:bar:3:+[mate]');

    engine.sendUpdate(fooStore, fooStore.clear());
    engine.sendUpdate(barStore, barStore.remove('i2'));
    engine.verify('onHandleUpdate:foo:3:(null)', 'onHandleUpdate:bar:4:-[there]');
  });

  it('handles dropped updates on a Variable with immediate resync', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, !CAN_WRITE);

    fooHandle.configure({notifyDesync: true});
    fooProxy.register(particle, fooHandle);
    engine.sendSync(fooStore);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo', 'onHandleSync:foo:0:(null)');

    // Drop event 2; desync is triggered by v3.
    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('v1')));
    fooStore.set(engine.newEntity('v2'));
    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('v3')));
    engine.verify('onHandleUpdate:foo:1:v1', 'SynchronizeProxy:foo', 'onHandleDesync:foo:3');

    engine.sendSync(fooStore);
    engine.verify('onHandleSync:foo:3:v3');
  });

  it('handles dropped updates on a Collection with immediate resync', async function() {
    let engine = new TestEngine();
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, !CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:bar:0:[]');

    // Drop event 2; desync is triggered by v3.
    engine.sendUpdate(barStore, barStore.store('i1', engine.newEntity('v1')));
    barStore.store('i2', engine.newEntity('v2'));
    engine.sendUpdate(barStore, barStore.store('i3', engine.newEntity('v3')));
    engine.verify('onHandleUpdate:bar:1:+[v1]', 'SynchronizeProxy:bar', 'onHandleDesync:bar:3');

    engine.sendSync(barStore);
    engine.verify('onHandleSync:bar:3:[v1|v2|v3]');
  });

  it('handles dropped updates on a Collection with delayed resync', async function() {
    let engine = new TestEngine();
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:bar:0:[]');

    // Drop event 2; desync is triggered by v3.
    engine.sendUpdate(barStore, barStore.store('i1', engine.newEntity('v1')));
    barStore.store('i2', engine.newEntity('v2'));
    engine.sendUpdate(barStore, barStore.store('i3', engine.newEntity('v3')));
    engine.verify('onHandleUpdate:bar:1:+[v1]', 'SynchronizeProxy:bar', 'onHandleDesync:bar:3');

    // Delay both the SynchronizeProxy request and response, such that the request arrives
    // when the storage object is at v5 and the response arrives at the proxy after the v6
    // and v7 updates have been sent:
    //   v1 (v2) v3 <desync> v4 v5 <resync-request> v6 v7 <resync-response>
    engine.sendUpdate(barStore, barStore.store('i4', engine.newEntity('v4')));
    engine.sendUpdate(barStore, barStore.store('i5', engine.newEntity('v5')));
    let v5Data = barStore.toListWithVersion();
    engine.sendUpdate(barStore, barStore.store('i6', engine.newEntity('v6')));
    engine.sendUpdate(barStore, barStore.remove('i1'));
    engine.sendSync(barStore, v5Data);
    engine.verify('onHandleSync:bar:5:[v1|v2|v3|v4|v5]',
                  'onHandleUpdate:bar:6:+[v6]',
                  'onHandleUpdate:bar:7:-[v1]');
  });

  it('handles misorded updates on a Collection', async function() {
    let engine = new TestEngine();
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, CAN_WRITE);

    barHandle.configure({notifyDesync: true});
    barProxy.register(particle, barHandle);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:bar', 'SynchronizeProxy:bar', 'onHandleSync:bar:0:[]');

    engine.sendUpdate(barStore, barStore.store('i1', engine.newEntity('v1'), 1));
    engine.sendUpdate(barStore, barStore.store('i4', engine.newEntity('v4'), 4));
    engine.sendUpdate(barStore, barStore.store('i3', engine.newEntity('v3'), 3));
    engine.sendUpdate(barStore, barStore.store('i2', engine.newEntity('v2'), 2));
    engine.sendUpdate(barStore, barStore.store('i5', engine.newEntity('v5'), 5));

    // Desync is triggered, but the resync message is ignored because the updates
    // "catch up" before the resync arrives.
    engine.verify(
      'onHandleUpdate:bar:1:+[v1]',
      'SynchronizeProxy:bar',
      'onHandleDesync:bar:4',
      'onHandleUpdate:bar:2:+[v2]',
      'onHandleUpdate:bar:3:+[v3]',
      'onHandleUpdate:bar:4:+[v4]',
      'onHandleUpdate:bar:5:+[v5]');
  });

  it('sends update notifications with non-synced handles', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, !CAN_WRITE);

    fooHandle.configure({keepSynced: false, notifyUpdate: true});
    barHandle.configure({keepSynced: false, notifyUpdate: true});
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    // Listeners are attached, but no initial sync requests are sent.
    engine.verify('InitializeProxy:foo', 'InitializeProxy:bar');

    // Updates are sent.
    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('v1')));
    engine.sendUpdate(barStore, barStore.store('i1', engine.newEntity('v1')));
    engine.verify('onHandleUpdate:foo:1:v1', 'onHandleUpdate:bar:1:+[v1]');

    // Desync events ignored, resync events are just updates.
    fooStore.set(engine.newEntity('v2'));
    barStore.store('i2', engine.newEntity('v2'));
    engine.sendUpdate(fooStore, fooStore.set(engine.newEntity('v3')));
    engine.sendUpdate(barStore, barStore.store('i3', engine.newEntity('v3')));
    engine.verify('onHandleUpdate:foo:3:v3', 'onHandleUpdate:bar:3:+[v3]');
  });

  it('non-readable handles are never synced', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, !CAN_READ, CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, !CAN_READ, CAN_WRITE);

    // No InitializeProxy or SynchronizeProxy calls.
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.verify();

    // All write calls go through to the backing store.
    fooHandle.set(engine.newEntity('abc'));
    fooHandle.clear();
    engine.verify('HandleSet:foo:abc', 'HandleClear:foo');

    let entity = engine.newEntity('def');
    barHandle.store(entity);
    barHandle.remove(entity);
    engine.verify('HandleStore:bar:def', 'HandleRemove:bar:' + entity.id);
  });

  it('reading from a synced proxy should not call the backing store', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, !CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, !CAN_WRITE);

    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.sendSync(fooStore);
    engine.sendSync(barStore);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                  'InitializeProxy:bar', 'SynchronizeProxy:bar',
                  'onHandleSync:foo:0:(null)', 'onHandleSync:bar:0:[]');

    // Reading should return the local copy and not call the backing store.
    fooHandle.get();
    barHandle.toList();
    engine.verify(); // no HandleGet or HandleToList
  });

  it('reading from a desynced proxy should call the backing store', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, CAN_WRITE);

    // Don't send the initial sync responses so the proxies stay desynchronized.
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo',
                  'InitializeProxy:bar', 'SynchronizeProxy:bar');

    // Reading should call through to the backing store.
    fooHandle.get();
    barHandle.toList();
    engine.verify('HandleGet:foo', 'HandleToList:bar');
  });

  it('reading from a non-syncing proxy should call the backing store', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let barStore = engine.newCollection('bar');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, CAN_WRITE);
    let [barProxy, barHandle] = engine.newProxy(barStore, particle, CAN_READ, CAN_WRITE);

    fooHandle.configure({keepSynced: false});
    barHandle.configure({keepSynced: false});
    fooProxy.register(particle, fooHandle);
    barProxy.register(particle, barHandle);
    engine.verify('InitializeProxy:foo', 'InitializeProxy:bar');

    // Reading should call through to the backing store.
    fooHandle.get();
    barHandle.toList();
    engine.verify('HandleGet:foo', 'HandleToList:bar');
  });

  it('writing to a synced proxy desyncs it until the update is received', async function() {
    let engine = new TestEngine();
    let fooStore = engine.newVariable('foo');
    let particle = engine.newParticle();
    let [fooProxy, fooHandle] = engine.newProxy(fooStore, particle, CAN_READ, CAN_WRITE);

    // Set up sync with an initial value.
    fooStore.set(engine.newEntity('start'));
    fooProxy.register(particle, fooHandle);
    engine.sendSync(fooStore);
    engine.verify('InitializeProxy:foo', 'SynchronizeProxy:foo', 'onHandleSync:foo:1:start');

    // Reading the inner-pec handle should return the local copy and not call the backing store.
    fooHandle.get();
    engine.verify();

    // Write to the inner-pec handle but delay sending the update event.
    let changed = engine.newEntity('changed');
    fooHandle.set(changed);
    engine.verify('HandleSet:foo:changed');

    // Read the handle again; this time the proxy is desynced and should call the backing store.
    fooHandle.get();
    engine.verify('HandleGet:foo');

    // Send the delayed update to resync the proxy.
    engine.sendUpdate(fooStore, fooStore.set(changed));
    engine.verify('onHandleUpdate:foo:2:changed');

    // Read the handle one more time; should return the local copy again.
    fooHandle.get();
    engine.verify();
  });
});
