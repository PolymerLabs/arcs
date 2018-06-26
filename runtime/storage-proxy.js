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

import {assert} from '../platform/assert-web.js';

const SyncState = {none: 0, pending: 1, full: 2};

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
export class StorageProxy {
  constructor(id, type, port, pec, scheduler, name) {
    this._id = id;
    this._type = type;
    this._port = port;
    this._pec = pec;
    this._scheduler = scheduler;
    this.name = name;

    // _model is an Entity for Variables or [Entity] for Collections.
    this._model = undefined;
    this._version = undefined;
    this._listenerAttached = false;
    this._keepSynced = false;
    this._synchronized = SyncState.none;
    this._observers = [];
    this._updates = [];
  }

  raiseSystemException(exception, methodName, particleId) {
    this._port.RaiseSystemException({exception: {message: exception.message, stack: exception.stack, name: exception.name}, methodName, particleId});
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }

  // Called by ParticleExecutionContext to associate (potentially multiple) particle/handle pairs with this proxy.
  register(particle, handle) {
    if (!handle.canRead)
      return;
    this._observers.push({particle, handle});

    // Attach an event listener to the backing store when the first readable handle is registered.
    if (!this._listenerAttached) {
      this._port.InitializeProxy({handle: this, callback: x => this._onUpdate(x)});
      this._listenerAttached = true;
    }

    // Change to synchronized mode as soon as we get any handle configured with keepSynced and send
    // a request to get the full model (once).
    // TODO: drop back to non-sync mode if all handles re-configure to !keepSynced
    if (handle.options.keepSynced) {
      if (!this._keepSynced) {
        this._port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        this._keepSynced = true;
      }

      // If a handle configured for sync notifications registers after we've received the full
      // model, notify it immediately.
      // TODO: add a unit test to cover this case
      if (handle.options.notifySync && this._synchronized == SyncState.full) {
        let model = this._model;
        if (Array.isArray(model)) {
          model = [...model];
        }
        this._scheduler.enqueue(particle, handle, ['sync', particle, model]);
      }
    }
  }

  // `model` contains 'version' and one of 'data' or 'list'.
  _onSynchronize(model) {
    if (this._version !== undefined && model.version <= this._version) {
      console.warn(`StorageProxy '${this._id}' received stale model version ${model.version}; ` +
                   `current is ${this._version}`);
      return;
    }

    // We may have queued updates that were received after a desync; discard any that are stale
    // with respect to the received model.
    this._synchronized = SyncState.full;
    while (this._updates.length > 0 && this._updates[0].version <= model.version) {
      this._updates.shift();
    }

    // Replace the stored data with the new one and notify handles that are configured for it.
    this._version = model.version;
    if ('data' in model) {
      this._model = model.data;
    } else if ('list' in model) {
      this._model = model.list;
    } else {
      assert(false, `StorageProxy received invalid synchronize event: ${JSON.stringify(received)}`);
    }
    for (let {handle, particle} of this._observers) {
      if (handle.options.keepSynced && handle.options.notifySync) {
        let model = this._model;
        if (Array.isArray(model)) {
          model = [...model];
        }
        this._scheduler.enqueue(particle, handle, ['sync', particle, model]);
      }
    }
    this._processUpdates();
  }

  // `update` contains 'version' and one of 'data', 'add' or 'remove'.
  _onUpdate(update) {
    // Immediately notify any handles that are not configured with keepSynced but do want updates.
    for (let {handle, particle} of this._observers) {
      if (!handle.options.keepSynced && handle.options.notifyUpdate) {
        this._scheduler.enqueue(particle, handle, ['update', particle, update]);
      }
    }

    // Bail if we're not in synchronized mode or this is a stale event.
    if (!this._keepSynced)
      return;
    if (update.version <= this._version) {
      console.warn(`StorageProxy '${this._id}' received stale update version ${update.version}; ` +
                   `current is ${this._version}`);
      return;
    }

    // Add the update to the queue and process. Most of the time the queue should be empty and
    // _processUpdates will consume this event immediately.
    this._updates.push(update);
    this._updates.sort((a, b) => a.version - b.version);
    this._processUpdates();
  }

  _processUpdates() {
    // Consume all queued updates whose versions are monotonically increasing from our stored one.
    while (this._updates.length > 0 && this._updates[0].version === this._version + 1) {
      let update = this._updates.shift();

      // Fold the update into our stored model.
      this._version = update.version;
      if ('data' in update) {
        this._model = update.data;
      } else if ('add' in update) {
        this._model.push(...update.add);
      } else if ('remove' in update) {
        let keep = [];
        for (let held of this._model) {
          keep.push(held);
          // TODO: avoid revisiting removed items? (eg. use a set of ids, prune as they are matched)
          for (let item of update.remove) {
            if (held.id === item.id) {
              keep.pop();
              break;
            }
          }
        }
        this._model = keep;
      } else {
        assert(false, `StorageProxy received invalid update event: ${JSON.stringify(update)}`);
      }

      // Notify handles configured with keepSynced and notifyUpdates (non-keepSynced handles are
      // notified as updates are received).
      for (let {handle, particle} of this._observers) {
        if (handle.options.keepSynced && handle.options.notifyUpdate) {
          this._scheduler.enqueue(particle, handle, ['update', particle, update]);
        }
      }
    }

    // If we still have update events queued, we must have received a future version are are now
    // desynchronized. Send a request for the full model and notify handles configured for it.
    if (this._updates.length > 0) {
      if (this._synchronized != SyncState.none) {
        this._synchronized = SyncState.none;
        this._port.SynchronizeProxy({handle: this, callback: x => this._onSynchronize(x)});
        for (let {handle, particle} of this._observers) {
          if (handle.options.notifyDesync) {
            this._scheduler.enqueue(particle, handle, ['desync', particle]);
          }
        }
      }
    } else if (this._synchronized != SyncState.full) {
      // If we were desynced but have now consumed all update events, we've caught up.
      this._synchronized = SyncState.full;
    }
  }

  generateIDComponents() {
    return this._pec.generateIDComponents();
  }

  // Read ops: if we're synchronized we can just return the local copy of the data.
  // Otherwise, send a request to the backing store.
  // TODO: in synchronized mode, these should integrate with SynchronizeProxy rather than
  //       sending a parallel request
  get(particleId) {
    if (this._synchronized == SyncState.full) {
      return new Promise((resolve, reject) => resolve(this._model));
    } else {
      return new Promise((resolve, reject) =>
        this._port.HandleGet({callback: r => resolve(r), handle: this, particleId}));
    }
  }

  toList(particleId) {
    if (this._synchronized == SyncState.full) {
      return new Promise((resolve, reject) => resolve(this._model));
    } else {
      return new Promise((resolve, reject) =>
        this._port.HandleToList({callback: r => resolve(r), handle: this, particleId}));
    }
  }

  // Write ops: in synchronized mode, any write operation will desynchronize the proxy, so
  // subsequent reads will call to the backing store until resync is established via the update
  // event triggered by the write.
  // TODO: handle concurrent writes from other parties to the backing store
  set(entity, particleId) {
    this._port.HandleSet({data: entity, handle: this, particleId});
    this._synchronized = SyncState.pending;
  }

  store(entity, particleId) {
    this._port.HandleStore({data: entity, handle: this, particleId});
    this._synchronized = SyncState.pending;
  }

  remove(entityId, particleId) {
    this._port.HandleRemove({data: entityId, handle: this, particleId});
    this._synchronized = SyncState.pending;
  }

  clear(particleId) {
    this._port.HandleClear({handle: this, particleId});
    this._synchronized = SyncState.pending;
  }
}

export class StorageProxyScheduler {
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
    let byHandle = this._queues.get(particle);
    if (!byHandle.has(handle)) {
      byHandle.set(handle, []);
    }
    let queue = byHandle.get(handle);
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
    if (this._idle) {
      return this._idle;
    }
    this._idle = new Promise(resolver => {
      this._idleResolver = resolver;
    });
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
      let particle = [...this._queues.keys()][0];
      let byHandle = this._queues.get(particle);
      this._queues.delete(particle);
      for (let [handle, queue] of byHandle.entries()) {
        for (let args of queue) {
          try {
            handle._notify(...args);
          } catch (e) {
            // TODO: report it via channel?
            // console.error(e);
          }
        }
      }
    }

    this._updateIdle();
  }
}
