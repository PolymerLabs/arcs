/** @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Entity} from './entity.js';
import {Symbols} from './symbols.js';
import {assert} from '../platform/assert-web.js';
import {ParticleSpec} from './particle-spec.js';

// TODO: This won't be needed once runtime is transferred between contexts.
function cloneData(data) {
  return data;
  //return JSON.parse(JSON.stringify(data));
}

function restore(entry, entityClass) {
  assert(entityClass, 'Handles need entity classes for deserialization');
  let {id, rawData} = entry;
  let entity = new entityClass(cloneData(rawData));
  if (entry.id) {
    entity.identify(entry.id);
  }

  // TODO some relation magic, somewhere, at some point.

  return entity;
}

/** @class Handle
 * Base class for Collections and Variables.
 */
class Handle {
  constructor(proxy, name, particleId, canRead, canWrite) {
    assert(!(proxy instanceof Handle));
    this._proxy = proxy;
    this.name = name || this._proxy.name;
    this.canRead = canRead;
    this.canWrite = canWrite;
    this._particleId = particleId;
    this.options = {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    };
  }

  raiseSystemException(exception, method) {
    this._proxy.raiseSystemException(exception, method, this._particleId);
  }

  // `options` may contain any of:
  // - keepSynced (bool): load full data on startup, maintain data in proxy and resync as required
  // - notifySync (bool): if keepSynced is true, call onHandleSync when the full data is received
  // - notifyUpdate (bool): call onHandleUpdate for every change event received
  // - notifyDesync (bool): if keepSynced is true, call onHandleDesync when desync is detected
  configure(options) {
    assert(this.canRead, 'configure can only be called on readable Handles');
    try {
      let keys = Object.keys(this.options);
      let badKeys = Object.keys(options).filter(o => !keys.includes(o));
      if (badKeys.length > 0) {
        throw new Error(`Invalid option in Handle.configure(): ${badKeys}`);
      }
      Object.assign(this.options, options);
    } catch (e) {
      this.raiseSystemException(e, 'Handle::configure');
      throw e;
    }
  }

  _serialize(entity) {
    assert(entity, 'can\'t serialize a null entity');
    if (!entity.isIdentified()) {
      entity.createIdentity(this._proxy.generateIDComponents());
    }
    let id = entity[Symbols.identifier];
    let rawData = entity.dataClone();
    return {
      id,
      rawData
    };
  }

  get type() {
    return this._proxy._type;
  }

  get _id() {
    return this._proxy._id;
  }

  toManifestString() {
    return `'${this._id}'`;
  }
}

/** @class Collection
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set. A particle's manifest dictates the types of handles that
 * need to be connected to that particle, and the current recipe identifies
 * which handles are connected.
 */
class Collection extends Handle {
  constructor(proxy, name, particleId, canRead, canWrite) {
    // TODO: this should talk to an API inside the PEC.
    super(proxy, name, particleId, canRead, canWrite);
  }
  query() {
    // TODO: things
  }

  // Called by StorageProxy.
  _notify(kind, particle, details) {
    assert(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        particle.onHandleSync(this, this._restore(details));
        return;
      case 'update': {
        let update = {};
        if ('add' in details) {
          update.added = this._restore(details.add);
        }
        if ('remove' in details) {
          update.removed = this._restore(details.remove);
        }
        update.originator = details.originatorId == this._particleId;
        particle.onHandleUpdate(this, update);
        return;
      }
      case 'desync':
        particle.onHandleDesync(this);
        return;
    }
  }

  /** @method async toList()
   * Returns a list of the Entities contained by the handle.
   * throws: Error if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
     in the particle's manifest.
   */
  async toList() {
    // TODO: remove this and use query instead
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    return this._restore(await this._proxy.toList(this._particleId));
  }

  _restore(list) {
    return (list !== null) ? list.map(a => restore(a, this.entityClass)) : null;
  }

  /** @method store(entity)
   * Stores a new entity into the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async store(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    let keys = [this._proxy.generateID('key')];
    return this._proxy.store(serialization, keys, this._particleId);
  }

  /** @method remove(entity)
   * Removes an entity from the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async remove(entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    let serialization = this._serialize(entity);
    // Remove the keys that exist at storage/proxy.
    let keys = [];
    return this._proxy.remove(serialization.id, keys, this._particleId);
  }
}

/** @class Variable
 * A handle on a single entity. A particle's manifest dictates
 * the types of handles that need to be connected to that particle, and
 * the current recipe identifies which handles are connected.
 */
class Variable extends Handle {
  constructor(proxy, name, particleId, canRead, canWrite) {
    super(proxy, name, particleId, canRead, canWrite);
  }

  // Called by StorageProxy.
  _notify(kind, particle, details) {
    assert(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        particle.onHandleSync(this, this._restore(details));
        return;
      case 'update': {
        particle.onHandleUpdate(this, {data: this._restore(details.data)});
        return;
      }
      case 'desync':
        particle.onHandleDesync(this);
        return;
    }
  }

  /** @method async get()
  * Returns the Entity contained by the Variable, or undefined if the Variable
  * is cleared.
  * throws: Error if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
    in the particle's manifest.
   */
  async get() {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    let model = await this._proxy.get(this._particleId);
    return this._restore(model);
  }

  _restore(model) {
    if (model === null) {
      return null;
    }
    if (this.type.isEntity) {
      return restore(model, this.entityClass);
    }
    return this.type.isInterface ? ParticleSpec.fromLiteral(model) : model;
  }

  /** @method set(entity)
   * Stores a new entity into the Variable, replacing any existing entity.
   * throws: Error if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async set(entity) {
    try {
      if (!this.canWrite) {
        throw new Error('Handle not writeable');
      }
      return this._proxy.set(this._serialize(entity), this._particleId);
    } catch (e) {
      this.raiseSystemException(e, 'Handle::set');
      throw e;
    }
  }

  /** @method clear()
   * Clears any entity currently in the Variable.
   * throws: Error if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    await this._proxy.clear(this._particleId);
  }
}

export function handleFor(proxy, isSet, name, particleId, canRead = true, canWrite = true) {
  return (isSet || (isSet == undefined && proxy.type.isCollection))
      ? new Collection(proxy, name, particleId, canRead, canWrite)
      : new Variable(proxy, name, particleId, canRead, canWrite);
}
