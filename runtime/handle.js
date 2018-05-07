/** @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import Entity from './entity.js';
import Relation from './relation.js';
import Symbols from './symbols.js';
let identifier = Symbols.identifier;
import assert from '../platform/assert-web.js';
import ParticleSpec from './particle-spec.js';

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
  }

  raiseSystemException(exception, method, particleId) {
    this._proxy.raiseSystemException(exception, method, particleId);
  }

  underlyingProxy() {
    return this._proxy;
  }

  resync() {
    return this._proxy.resync();
  }

  /** @method on(kind, callback, target)
   * Register for callbacks every time the requested kind of event occurs.
   * Events are grouped into delivery sets by target, which should therefore
   * be the recieving particle.
   */
  on(kind, callback, target) {
    return this._proxy.on(kind, callback, target, this._particleId);
  }

  synchronize(kind, modelCallback, callback, target) {
    return this._proxy.synchronize(kind, modelCallback, callback, target, this._particleId);
  }

  generateID() {
    assert(this._proxy.generateID);
    return this._proxy.generateID();
  }

  generateIDComponents() {
    assert(this._proxy.generateIDComponents);
    return this._proxy.generateIDComponents();
  }

  _serialize(entity) {
    assert(entity, 'can\'t serialize a null entity');
    if (!entity.isIdentified())
      entity.createIdentity(this.generateIDComponents());
    let id = entity[identifier];
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

  notify(particle, version, update) {
    assert(this.canRead, 'notify should not be called for non-readable handles');
    update.collection = this._restore(update.collection);
    particle.onHandleUpdate(this, version, update);
  }

  /** @method async toList()
   * Returns a list of the Entities contained by the handle.
   * throws: Error if this handle is not configured as a readable handle (i.e. 'in' or 'inout')
     in the particle's manifest.
   */
  async toList() {
    // TODO: remove this and use query instead
    if (!this.canRead)
      throw new Error('Handle not readable');
    return this._restore(await this._proxy.toList(this._particleId));
  }

  _restore(list) {
    return (list != null) ? list.map(a => restore(a, this.entityClass)) : null;
  }

  /** @method store(entity)
   * Stores a new entity into the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async store(entity) {
    if (!this.canWrite)
      throw new Error('Handle not writeable');
    let serialization = this._serialize(entity);
    return this._proxy.store(serialization, this._particleId);
  }

  /** @method remove(entity)
   * Removes an entity from the Handle.
   * throws: Error if this handle is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async remove(entity) {
    if (!this.canWrite)
      throw new Error('Handle not writeable');
    let serialization = this._serialize(entity);
    return this._proxy.remove(serialization.id, this._particleId);
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

  notify(particle, version, update) {
    assert(this.canRead, 'notify should not be called for non-readable handles');
    update.variable = this._restore(update.variable);
    particle.onHandleUpdate(this, version, update);
  }

  /** @method async get()
  * Returns the Entity contained by the Variable, or undefined if the Variable
  * is cleared.
  * throws: Error if this variable is not configured as a readable handle (i.e. 'in' or 'inout')
    in the particle's manifest.
   */
  async get() {
    if (!this.canRead)
      throw new Error('Handle not readable');
    let model = await this._proxy.get(this._particleId);
    return this._restore(model);
  }

  _restore(model) {
    if (model == null)
      return null;
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
      if (!this.canWrite)
        throw new Error('Handle not writeable');
      return this._proxy.set(this._serialize(entity), this._particleId);
    } catch (e) {
      this.raiseSystemException(e, 'Handle::set', this._particleId);
      throw e;
    }
  }

  /** @method clear()
   * Clears any entity currently in the Variable.
   * throws: Error if this variable is not configured as a writeable handle (i.e. 'out' or 'inout')
     in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite)
      throw new Error('Handle not writeable');
    await this._proxy.clear(this._particleId);
  }
}

function handleFor(proxy, isSet, name, particleId, canRead = true, canWrite = true) {
  return (isSet || (isSet == undefined && proxy.type.isSetView))
      ? new Collection(proxy, name, particleId, canRead, canWrite)
      : new Variable(proxy, name, particleId, canRead, canWrite);
}

export {handleFor};
