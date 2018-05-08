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

export class StorageProxy {
  constructor(id, type, port, pec, name, version) {
    this._id = id;
    this._type = type;
    this._port = port;
    this._pec = pec;
    this.name = name;
    this._version = version;
    this._variable = undefined;
    this._collection = undefined;
    this._observers = [];
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

  // Sets up a change listener on the outer storage provider.
  // Must be invoked after the newly constructed proxy has been mapped into the API channel.
  _initialize() {
    let callback = received => {
      if (received.version < this._version) {
        console.warn(`StorageProxy '${this._id}' received old version ${received.version}; current is ${this._version}`);
        return;
      }
      if (received.version == this._version) {
        return;
      }

      let added, removed;
      if ('data' in received) {
        // Backing storage is a Variable containing a single Entity.
        this._variable = received.data;
      } else if ('list' in received) {
        // Backing storage is a Collection and we've been given the full set.
        this._collection = received.list;
      } else if (this._version !== null && received.version === this._version + 1) {
        // We've been given the next version of a Collection and have previously received the initial set.
        [added, removed] = this._processCollectionUpdate(received);
      } else {
        // We've missed an update or didn't receive the initial set.
        // TODO: move to a "desync" state that discards new updates until resynced?
        this._observers.forEach(({particle, handle}) => particle.onHandleDesync(handle, received.version));
        return;
      }
      this._version = received.version;
      this._observers.forEach(({particle, handle}) => {
        handle.notify(particle, this._version, this._buildUpdate(added, removed));
      });
    };
    // TODO: consider deferring this until we have a registered observer; if all particles in the
    // current arc only ever write to this proxy, there's no need to catch update events.
    this._port.InitializeProxy({handle: this, callback});
  }

  // Folds the add/remove change into the stored _collection model, and returns the ids of the
  // entities added or removed.
  _processCollectionUpdate(received) {
    if ('add' in received) {
      this._collection.push(...received.add);
      return [received.add.map(e => e.id), undefined];
    }
    if ('remove' in received) {
      let keep = [];
      let removed = [];
      for (let held of this._collection) {
        keep.push(held);
        // TODO: avoid revisiting removed items? (e.g. use a set of ids, prune as they are matched)
        for (let item of received.remove) {
          if (held.id === item.id) {
            keep.pop();
            removed.push(item.id);
            break;
          }
        }
      }
      this._collection = keep;
      return [undefined, removed];
    }
    assert(false, `StorageProxy received invalid change event: ${JSON.stringify(received)}`);
  }

  // Called by InnerPEC to associate (potentially multiple) particle/handle pairs with this proxy.
  register(particle, handle) {
    this._observers.push({particle, handle});
    if (this._version != null) {
      handle.notify(particle, this._version, this._buildUpdate());
    }
  }

  // Builds the update object passed to particles. Only relevant fields are defined. Note that we
  // don't want to say 'update.x = undefined', because then ('x' in update) still returns true.
  _buildUpdate(added, removed) {
    let update = {};
    if (this._variable !== undefined) {
      update.variable = this._variable;
    }
    if (this._collection !== undefined) {
      update.collection = this._collection;
    }
    if (added !== undefined) {
      update.added = added;
    }
    if (removed !== undefined) {
      update.removed = removed;
    }
    return update;
  }

  // Retrieve the full data from the backing storage.
  resync() {
    let callback = received => {
      if ('data' in received) {
        this._variable = received.data;
      } else if ('list' in received) {
        this._collection = received.list;
      } else {
        assert(false, `StorageProxy received invalid resync event: ${JSON.stringify(received)}`);
      }
      this._version = received.version;
      this._observers.forEach(({particle, handle}) => {
        handle.notify(particle, this._version, this._buildUpdate());
      });
    };
    this._port.ResyncHandle({handle: this, callback});
  }

  generateIDComponents() {
    return this._pec.generateIDComponents();
  }

  on(type, callback, target, particleId) {
    let dataFreeCallback = (d) => callback();
    this.synchronize(type, dataFreeCallback, dataFreeCallback, target, particleId);
  }

  synchronize(type, modelCallback, callback, target, particleId) {
    this._port.Synchronize({handle: this, modelCallback, callback, target, type, particleId});
  }

  get(particleId) {
    return new Promise((resolve, reject) =>
      this._port.HandleGet({callback: r => resolve(r), handle: this, particleId}));
  }

  toList(particleId) {
    return new Promise((resolve, reject) =>
      this._port.HandleToList({callback: r => resolve(r), handle: this, particleId}));
  }

  set(entity, particleId) {
    this._port.HandleSet({data: entity, handle: this, particleId});
  }

  store(entity, particleId) {
    this._port.HandleStore({data: entity, handle: this, particleId});
  }

  remove(entityId, particleId) {
    this._port.HandleRemove({data: entityId, handle: this, particleId});
  }

  clear(particleId) {
    this._port.HandleClear({handle: this, particleId});
  }
}
