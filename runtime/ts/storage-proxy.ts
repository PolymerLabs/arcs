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

import {assert} from '../../platform/assert-web.js';
import {CrdtCollectionModel, SerializedModelEntry} from './storage/crdt-collection-model.js';
import {Type} from './type.js';
import {PECInnerPort} from '../api-channel.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {Particle} from './particle.js';
import {Handle, HandleOptions} from './handle.js';

enum SyncState {none=0, pending=1, full=2};

/** @class StorageProxy
 * Mediates between one or more Handles and the backing store outside the PEC.
 *
 * This can operate in two modes, based on how observing handles are configured:
 * - synchronized: the proxy maintains a copy of the full data held by the backing store, keeping
 *                 it in sync by listening to change events from the store.
 * - unsynchronized: the proxy simply passes through calls from Handles to the backing store.
 *
 * In synchronized mode we maintain a queue of sorted update events received from the backing store.
 * While events are received correctly - each update is one version ahead of our stored model - they
 * are processed immediately and observing handles are notified accordingly. If we receive an update
 * with a "future" version, the proxy is desynchronized:
 * - a request for the full data is sent to the backing store;
 * - any update events received after that (and before the response) are added to the queue;
 * - any new updates that can be applied will be (which may cause the proxy to "catch up" and resync
 *   before the full data response arrives);
 * - once the resync response is received, stale queued updates are discarded and any remaining ones
 *   are applied.
 */
export abstract class StorageProxy {
  static newProxy(id: string, type: Type, port: PECInnerPort, pec: ParticleExecutionContext, scheduler, name: string) {
    if (type.isCollection) {
      return new CollectionProxy(id, type, port, pec, scheduler, name);
    }
    if (type.isBigCollection) {
      return new BigCollectionProxy(id, type, port, pec, scheduler, name);
    }
    return new VariableProxy(id, type, port, pec, scheduler, name);
  }

  storageKey: string;
  readonly id: string;
  readonly type: Type;
  protected readonly port: PECInnerPort;
  protected readonly scheduler: StorageProxyScheduler;
  name: string;
  private baseForNewID: string;
  pec: ParticleExecutionContext;

  private localIDComponent = 0;
  protected version: number | undefined = undefined;
  protected listenerAttached = false;
  private keepSynced = false;
  protected synchronized = SyncState.none;
  protected observers: {particle: Particle, handle: Handle}[] = [];
  private updates: {version: number}[] = [];
  protected barrier: string | null = null;
  constructor(id: string, type: Type, port: PECInnerPort, pec: ParticleExecutionContext, scheduler, name: string) {
    this.id = id;
    this.type = type;
    this.port = port;
    this.scheduler = scheduler;
    this.name = name;
    this.baseForNewID = pec.generateID();

    this.updates = [];

    this.pec = pec;
  }


  // TODO(shans): _getModelForSync returns a list from collections and
  // a singleton from variables. Fix this.
  // tslint:disable-next-line: no-any
  abstract _getModelForSync() : any;
  abstract _synchronizeModel(version: number, model: SerializedModelEntry[]): boolean;
  abstract _processUpdate(update: {version: number}, apply?: boolean): any;

  raiseSystemException(exception, methodName, particleId) {
    this.port.RaiseSystemException({exception: {message: exception.message, stack: exception.stack, name: exception.name}, methodName, particleId});
  }

  /**
   *  Called by ParticleExecutionContext to associate (potentially multiple) particle/handle pairs with this proxy.
   */
  register(particle, handle) {
    if (!handle.canRead) {
      return;
    }
    this.observers.push({particle, handle});

    // Attach an event listener to the backing store when the first readable handle is registered.
    if (!this.listenerAttached) {
      this.port.InitializeProxy({handle: this, callback: x => this._onUpdate(x)});
      this.listenerAttached = true;
    }

    // Change to synchronized mode as soon as we get any handle configured with keepSynced and send
    // a request to get the full model (once).
    // TODO: drop back to non-sync mode if all handles re-configure to !keepSynced
    if (handle.options.keepSynced) {
      if (!this.keepSynced) {
        this.port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        this.keepSynced = true;
      }

      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      if (handle.options.notifySync && this.synchronized == SyncState.full) {
        const syncModel = this._getModelForSync();
        this.scheduler.enqueue(particle, handle, ['sync', particle, syncModel]);
      }
    }
  }

  _onSynchronize({version, model}) {
    if (this.version !== undefined && version <= this.version) {
      console.warn(`StorageProxy '${this.id}' received stale model version ${version}; ` +
                   `current is ${this.version}`);
      return;
    }

    // Replace the stored data with the new one and notify handles that are configured for it.
    if (!this._synchronizeModel(version, model)) {
      return;
    }

    // We may have queued updates that were received after a desync; discard any that are stale
    // with respect to the received model.
    this.synchronized = SyncState.full;
    while (this.updates.length > 0 && this.updates[0].version <= version) {
      this.updates.shift();
    }

    const syncModel = this._getModelForSync();
    this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);
    this._processUpdates();
  }

  _onUpdate(update) {
    // Immediately notify any handles that are not configured with keepSynced but do want updates.
    if (this.observers.find(({handle}) => !handle.options.keepSynced && handle.options.notifyUpdate)) {
      const handleUpdate = this._processUpdate(update, false);
      this._notify('update', handleUpdate, options => !options.keepSynced && options.notifyUpdate);
    }

    // Bail if we're not in synchronized mode or this is a stale event.
    if (!this.keepSynced) {
      return;
    }
    if (update.version <= this.version) {
      console.warn(`StorageProxy '${this.id}' received stale update version ${update.version}; ` +
                   `current is ${this.version}`);
      return;
    }

    // Add the update to the queue and process. Most of the time the queue should be empty and
    // _processUpdates will consume this event immediately.
    this.updates.push(update);
    this.updates.sort((a, b) => a.version - b.version);
    this._processUpdates();
  }

  _notify(kind, details, predicate=(ignored: HandleOptions) => true) {
    for (const {handle, particle} of this.observers) {
      if (predicate(handle.options)) {
        this.scheduler.enqueue(particle, handle, [kind, particle, details]);
      }
    }
  }

  _processUpdates() {

    const updateIsNext = update => {
      if (update.version == this.version + 1) {
        return true;
      }
      // Holy Layering Violation Batman
      // 
      // If we are a variable waiting for a barriered set response
      // then that set response *is* the next thing we're waiting for,
      // regardless of version numbers.
      //
      // TODO(shans): refactor this code so we don't need to layer-violate. 
      if (this.barrier && update.barrier == this.barrier) {
        return true;
      }
      return false;
    };

    // Consume all queued updates whose versions are monotonically increasing from our stored one.
    while (this.updates.length > 0 && updateIsNext(this.updates[0])) {
      const update = this.updates.shift();

      // Fold the update into our stored model.
      const handleUpdate = this._processUpdate(update);
      this.version = update.version;

      // Notify handles configured with keepSynced and notifyUpdates (non-keepSynced handles are
      // notified as updates are received).
      if (handleUpdate) {
        this._notify('update', handleUpdate, options => options.keepSynced && options.notifyUpdate);
      }
    }

    // If we still have update events queued, we must have received a future version are are now
    // desynchronized. Send a request for the full model and notify handles configured for it.
    if (this.updates.length > 0) {
      if (this.synchronized != SyncState.none) {
        this.synchronized = SyncState.none;
        this.port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        for (const {handle, particle} of this.observers) {
          if (handle.options.notifyDesync) {
            this.scheduler.enqueue(particle, handle, ['desync', particle]);
          }
        }
      }
    } else if (this.synchronized != SyncState.full) {
      // If we were desynced but have now consumed all update events, we've caught up.
      this.synchronized = SyncState.full;
    }
  }

  generateID() {
    return `${this.baseForNewID}:${this.localIDComponent++}`;
  }

  generateIDComponents() {
    return {base: this.baseForNewID, component: () => this.localIDComponent++};
  }
}

/**
 * Collections are synchronized in a CRDT Observed/Removed scheme.
 * Each value is identified by an ID and a set of membership keys.
 * Concurrent adds of the same value will specify the same ID but different
 * keys. A value is removed by removing all of the observed keys. A value
 * is considered to be removed if all of it's keys have been removed.
 *
 * In synchronized mode mutation takes place synchronously inside the proxy.
 * The proxy uses the originatorId to skip over redundant events sent back
 * by the storage object.
 *
 * In unsynchronized mode removal is not based on the keys observed at the
 * proxy, since the proxy does not remember the state, but instead the set
 * of keys that exist at the storage object at the time it receives the
 * request.
 */
export class CollectionProxy extends StorageProxy {
  private model = new CrdtCollectionModel();

  _getModelForSync() {
    return this.model.toList();
  }

  _synchronizeModel(version: number, model: SerializedModelEntry[]): boolean {
    this.version = version;
    this.model = new CrdtCollectionModel(model);
    return true;
  }

  _processUpdate(update, apply=true) {
    if (this.synchronized == SyncState.full) {
      // If we're synchronized, then any updates we sent have
      // already been applied/notified.
      for (const {handle} of this.observers) {
        if (update.originatorId == handle._particleId) {
          return null;
        }
      }
    }
    const added = [];
    const removed = [];
    if ('add' in update) {
      for (const {value, keys, effective} of update.add) {
        if (apply && this.model.add(value.id, value, keys) || !apply && effective) {
          added.push(value);
        }
      }
    } else if ('remove' in update) {
      for (const {value, keys, effective} of update.remove) {
        const localValue = this.model.getValue(value.id);
        if (apply && this.model.remove(value.id, keys) || !apply && effective) {
          removed.push(localValue);
        }
      }
    } else {
      throw new Error(`StorageProxy received invalid update event: ${JSON.stringify(update)}`);
    }
    if (added.length || removed.length) {
      const result: {add?: {}[], remove?: {}[], originatorId: string} = {originatorId: update.originatorId};
      if (added.length) result.add = added;
      if (removed.length) result.remove = removed;
      return result;
    }
    return null;
  }

  // Read ops: if we're synchronized we can just return the local copy of the data.
  // Otherwise, send a request to the backing store.
  toList(particleId) {
    if (this.synchronized == SyncState.full) {
      return Promise.resolve(this.model.toList());
    } else {
      // TODO: in synchronized mode, this should integrate with SynchronizeProxy rather than
      //       sending a parallel request
      return new Promise(resolve =>
        this.port.HandleToList({callback: resolve, handle: this, particleId}));
    }
  }

  get(id, particleId) {
    if (this.synchronized == SyncState.full) {
      return Promise.resolve(this.model.getValue(id));
    } else {
      return new Promise((resolve, reject) =>
        this.port.HandleToList({callback: r => resolve(r.find(entity => entity.id === id)), handle: this, particleId}));
    }
  }

  store(value, keys, particleId) {
    const id = value.id;
    const data = {value, keys};
    this.port.HandleStore({handle: this, callback: () => {}, data, particleId});

    if (this.synchronized != SyncState.full) {
      return;
    }
    if (!this.model.add(id, value, keys)) {
      return;
    }
    const update = {originatorId: particleId, add: [value]};
    this._notify('update', update, options => options.notifyUpdate);
  }

  clear(particleId) {
    if (this.synchronized != SyncState.full) {
      this.port.HandleRemoveMultiple({handle: this, callback: () => {}, data: [], particleId});
    }

    let items = this.model.toList().map(item => ({id: item.id, keys: this.model.getKeys(item.id)}));
    this.port.HandleRemoveMultiple({handle: this, callback: () => {}, data: items, particleId});

    items = items.map(({id, keys}) => ({rawData: this.model.getValue(id).rawData, id, keys}));
    items = items.filter(item => this.model.remove(item.id, item.keys));
    if (items.length > 0) {
      this._notify('update', {originatorId: particleId, remove: items}, options => options.notifyUpdate);
    }
  }

  remove(id, keys, particleId) {
    if (this.synchronized != SyncState.full) {
      const data = {id, keys: []};
      this.port.HandleRemove({handle: this, callback: () => {}, data, particleId});
      return;
    }

    const value = this.model.getValue(id);
    if (!value) {
      return;
    }
    if (keys.length == 0) {
      keys = this.model.getKeys(id);
    }
    const data = {id, keys};
    this.port.HandleRemove({handle: this, callback: () => {}, data, particleId});

    if (!this.model.remove(id, keys)) {
      return;
    }
    const update = {originatorId: particleId, remove: [value]};
    this._notify('update', update, options => options.notifyUpdate);
  }
}

/**
 * Variables are synchronized in a 'last-writer-wins' scheme. When the
 * VariableProxy mutates the model, it sets a barrier and expects to
 * receive the barrier value echoed back in a subsequent update event.
 * Between those two points in time updates are not applied or
 * notified about as these reflect concurrent writes that did not 'win'.
 */
export class VariableProxy extends StorageProxy {
  model: {id: string} | null = null;
  
  _getModelForSync() {
    return this.model;
  }

  _synchronizeModel(version: number, model: SerializedModelEntry[]): boolean {
    // If there's an active barrier then we shouldn't apply the model here, because
    // there is a more recent write from the particle side that is still in flight.
    if (this.barrier != null) {
      return false;
    }
    this.version = version;
    this.model = model.length == 0 ? null : model[0].value;
    assert(this.model !== undefined);
    return true;
  }

  _processUpdate(update, apply=true) {
    assert('data' in update);
    if (!apply) {
      return update;
    }
    // If we have set a barrier, suppress updates until after
    // we have seen the barrier return via an update.
    if (this.barrier != null) {
      if (update.barrier == this.barrier) {
        this.barrier = null;

        // HOLY LAYERING VIOLATION BATMAN
        //
        // We just cleared a barrier which means we are now synchronized. If we weren't
        // synchronized already, then we need to tell the handles.
        //
        // TODO(shans): refactor this code so we don't need to layer-violate. 
        if (this.synchronized !== SyncState.full) {
          this.synchronized = SyncState.full;
          const syncModel = this._getModelForSync();
          this._notify('sync', syncModel, options => options.keepSynced && options.notifySync);

        }
      }
      return null;
    }
    this.model = update.data;
    return update;
  }

  // Read ops: if we're synchronized we can just return the local copy of the data.
  // Otherwise, send a request to the backing store.
  // TODO: in synchronized mode, these should integrate with SynchronizeProxy rather than
  //       sending a parallel request
  get(particleId) {
    if (this.synchronized === SyncState.full) {
      return Promise.resolve(this.model);
    } else {
      return new Promise(resolve =>
        this.port.HandleGet({callback: resolve, handle: this, particleId}));
    }
  }

  set(entity, particleId) {
    assert(entity !== undefined);
    if (JSON.stringify(this.model) === JSON.stringify(entity)) {
      return;
    }
    let barrier;

    // If we're setting to this handle but we aren't listening to firebase, 
    // then there's no point creating a barrier. In fact, if the response 
    // to the set comes back before a listener is registered then this proxy will
    // end up locked waiting for a barrier that will never arrive.
    if (this.listenerAttached) {
      // TODO(shans): this.generateID() used to take a parameter. Is this the
      // cause of some of the key collisions we're seeing?
      barrier = this.generateID(/* 'barrier' */);
    } else {
      barrier = null;
    }
    // TODO: is this already a clone?
    this.model = JSON.parse(JSON.stringify(entity));
    this.barrier = barrier;
    this.port.HandleSet({data: entity, handle: this, particleId, barrier});
    const update = {originatorId: particleId, data: entity};
    console.log(update);
    this._notify('update', update, options => options.notifyUpdate);
  }

  clear(particleId) {
    if (this.model == null) {
      return;
    }
    const barrier = this.generateID(/* 'barrier' */);
    this.model = null;
    this.barrier = barrier;
    this.port.HandleClear({handle: this, particleId, barrier});
    const update = {originatorId: particleId, data: null};
    this._notify('update', update, options => options.notifyUpdate);
  }
}

// BigCollections are never synchronized. No local state is held and all operations are passed
// directly through to the backing store.
export class BigCollectionProxy extends StorageProxy {
  register(particle, handle) {
    if (handle.canRead) {
      this.scheduler.enqueue(particle, handle, ['sync', particle, {}]);
    }
  }

  // tslint:disable-next-line: no-any
  _getModelForSync() : any {
    throw new Error("_getModelForSync not implemented for BigCollectionProxy");
  }

  _processUpdate() {
    throw new Error("_processUpdate not implemented for BigCollectionProxy");
  }

  _synchronizeModel() : boolean {
    throw new Error("_synchronizeModel not implemented for BigCollectionProxy");
  }
  // TODO: surface get()

  async store(value, keys, particleId) {
    return new Promise<void>(resolve =>
      this.port.HandleStore({handle: this, callback: resolve, data: {value, keys}, particleId}));
  }

  async remove(id, particleId) {
    return new Promise(resolve =>
      this.port.HandleRemove({handle: this, callback: resolve, data: {id, keys: []}, particleId}));
  }

  async stream(pageSize, forward) {
    return new Promise(resolve =>
      this.port.HandleStream({handle: this, callback: resolve, pageSize, forward}));
  }

  async cursorNext(cursorId) {
    return new Promise<{done: boolean, value: {}[]}>(resolve =>
      this.port.StreamCursorNext({handle: this, callback: resolve, cursorId}));
  }

  cursorClose(cursorId) {
    this.port.StreamCursorClose({handle: this, cursorId});
  }
}

export class StorageProxyScheduler {
  private _scheduled = false;
  private _queues = new Map<Particle, Map<Handle, [string, Particle, {}][]>>();
  private _idleResolver: (() => void) | null = null;
  private _idle: Promise<void> | null = null;
  constructor() {
    this._scheduled = false;
    // Particle -> {Handle -> [Queue of events]}
    this._queues = new Map();
  }

  // TODO: break apart args here, sync events should flush the queue.
  enqueue(particle, handle, args) {
    if (!this._queues.has(particle)) {
      this._queues.set(particle, new Map());
    }
    const byHandle = this._queues.get(particle);
    if (!byHandle.has(handle)) {
      byHandle.set(handle, []);
    }
    const queue = byHandle.get(handle);
    queue.push(args);
    this._schedule();
  }

  get busy() {
    return this._queues.size > 0;
  }

  _updateIdle() {
    if (this._idleResolver && !this.busy) {
      this._idleResolver();
      this._idle = null;
      this._idleResolver = null;
    }
  }

  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    if (!this._idle) {
      this._idle = new Promise(resolve => this._idleResolver = resolve);
    }
    return this._idle;
  }

  _schedule() {
    if (this._scheduled) {
      return;
    }
    this._scheduled = true;
    setTimeout(() => {
      this._scheduled = false;
      this._dispatch();
    }, 0);
  }

  _dispatch() {
    // TODO: should we process just one particle per task?
    while (this._queues.size > 0) {
      const particle = [...this._queues.keys()][0];
      const byHandle = this._queues.get(particle);
      this._queues.delete(particle);
      for (const [handle, queue] of byHandle.entries()) {
        for (const args of queue) {
          try {
            handle._notify(...args);
          } catch (e) {
            console.error('Error dispatching to particle', e);
            handle._proxy.raiseSystemException(e, 'StorageProxyScheduler::_dispatch', handle._particleId);
          }
        }
      }
    }

    this._updateIdle();
  }
}
