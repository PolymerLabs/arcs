/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {SystemException, UserException} from './arc-exceptions.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle} from './particle.js';
import {ParticleExecutionContext} from '../runtime/particle-execution-context.js';
import {BigCollectionType, CollectionType, EntityType, InterfaceType, ReferenceType, Type} from './type.js';
import {EntityClass, Entity, SerializedEntity} from './entity.js';
import {Store, SingletonStore, CollectionStore, BigCollectionStore} from './store.js';
import {IdGenerator, Id} from './id.js';
import {SYMBOL_INTERNALS} from './symbols.js';
import {Handle as HandleNG, handleNGFor} from './storageNG/handle.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {StorageProxy as StorageProxyNG} from './storageNG/storage-proxy.js';

// While transitioning to the NG storage stack, we define Handle as either the
// "old" handle (before migration) or the NG handle. After migration the handle
// defined in this file should go away.
export type Handle = HandleOld | HandleNG<CRDTTypeRecord>;

/**
 * An interface representing anything storable in a Handle. Concretely, this is the {@link Entity}
 * and {@link ClientReference} classes.
 */
export interface Storable {
  [SYMBOL_INTERNALS]: {serialize: () => SerializedEntity};
}

// TODO: This won't be needed once runtime is transferred between contexts.
function cloneData(data) {
  return data;
  //return JSON.parse(JSON.stringify(data));
}

function restore(entry: SerializedEntity, entityClass: EntityClass) {
  assert(entityClass, 'Handles need entity classes for deserialization');
  const {id, rawData} = entry;
  const entity = new entityClass(cloneData(rawData));
  if (entry.id) {
    // StorageKeys aren't plumbed into the handles of old storage, so we don't have them
    // available as part of entity identity.
    Entity.identify(entity, entry.id, null);
  }

  // TODO some relation magic, somewhere, at some point.

  return entity;
}

export interface HandleOptions {keepSynced: boolean; notifySync: boolean; notifyUpdate: boolean; notifyDesync: boolean;}

type NoOpStorageAllocator = (id: string, type: Type) => Store;
// The following must return a Reference, but we are trying to break the cyclic
// dependency between this file and reference.ts, so we lose a little bit of type safety
// to do that.
type ReferenceMaker = (data: {id: string, entityStorageKey: string | null}, type: ReferenceType, context: ParticleExecutionContext) => {};

/**
 * Base class for Collections and Singletons.
 */
export abstract class HandleOld {
  protected _storage: Store;
  private readonly idGenerator: IdGenerator;
  readonly name: string;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  readonly _particleId: string|null;
  readonly options: HandleOptions;
  entityClass: EntityClass|null;

  static noOpStorageAllocator : NoOpStorageAllocator = null;
  static makeReference : ReferenceMaker = null;

  abstract _notify(kind: string, particle: Particle, details: {});

  // TODO type particleId, marked as string, but called with number
  constructor(storage: Store, idGenerator: IdGenerator, name: string, particleId: string|null, canRead: boolean, canWrite: boolean) {
    assert(!(storage instanceof HandleOld));
    this._storage = storage;
    this.idGenerator = idGenerator;
    this.name = name || this.storage.name;
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

  protected reportUserExceptionInHost(exception: Error, particle: Particle, method: string) {
    this.storage.reportExceptionInHost(new UserException(exception, method, this._particleId, particle.spec.name));
  }

  protected reportSystemExceptionInHost(exception: Error, method: string): void {
    this.storage.reportExceptionInHost(new SystemException(exception, method, this._particleId));
  }

  // `options` may contain any of:
  // - keepSynced (bool): load full data on startup, maintain data in proxy and resync as required
  // - notifySync (bool): if keepSynced is true, call onHandleSync when the full data is received
  // - notifyUpdate (bool): call onHandleUpdate for every change event received
  // - notifyDesync (bool): if keepSynced is true, call onHandleDesync when desync is detected
  configure(options): void {
    assert(this.canRead, 'configure can only be called on readable Handles');
    try {
      const keys = Object.keys(this.options);
      const badKeys = Object.keys(options).filter(o => !keys.includes(o));
      if (badKeys.length > 0) {
        throw new Error(`Invalid option in Handle.configure(): ${badKeys}`);
      }
      Object.assign(this.options, options);
    } catch (e) {
      this.reportSystemExceptionInHost(e, 'Handle::configure');
      throw e;
    }
  }

  _serialize(entity: Storable) {
    assert(entity, `can't serialize a null entity`);
    if (entity instanceof Entity) {
      if (!Entity.isIdentified(entity)) {
        this.createIdentityFor(entity);
      }
    }
    const ser = entity[SYMBOL_INTERNALS].serialize();
    return ser;
  }

  createIdentityFor(entity: Entity) {
    // StorageKeys and Ttls aren't plumbed into the handles of old storage, so we don't have them
    // available as part of entity identity.
    Entity.createIdentity(entity, Id.fromString(this._id), this.idGenerator, null, null);
  }

  get type() {
    return this.storage.type;
  }

  get _id(): string {
    return this.storage.id;
  }

  get storage(): Readonly<Store> {
    return this._storage;
  }

  toManifestString(): string {
    return `'${this._id}'`;
  }

  protected generateKey(): string {
    return this.idGenerator.newChildId(Id.fromString(this._id), 'key').toString();
  }

  /**
   * Disables this handle so that it is no longer able to make changes or receive updates from the
   * storage proxy
   */
  disable(particle?: Particle): void {
    // This used to check that storage is a StorageProxy, but we are trying
    // to remove all references to StorageProxy to break cyclic dependencies.
    // tslint:disable-next-line: no-any
    if (typeof (this.storage as any).deregister === 'function') {
      // tslint:disable-next-line: no-any
      (this.storage as any).deregister(particle, this);
    }
    // Set this handle's storage to a no-operation storage proxy so any actions that need to be
    // taken by this handle in the future (due to some async operations) will do nothing and finish quietly
    //this._storage = StorageProxy.newNoOpProxy(this.storage.id, this.storage.type);
    this._storage = HandleOld.noOpStorageAllocator(this.storage.id, this.storage.type);
  }
}

/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set. A particle's manifest dictates the types of handles that
 * need to be connected to that particle, and the current recipe identifies
 * which handles are connected.
 */
export class Collection extends HandleOld {
  // Called by StorageProxy.
  protected _storage: CollectionStore;

  async _notify(kind: string, particle: Particle, details) {
    assert(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        await particle.callOnHandleSync(this, this._restore(details), e => this.reportUserExceptionInHost(e, particle, 'onHandleSync'));
        return;
      case 'update': {
        // tslint:disable-next-line: no-any
        const update: {added?: any, removed?: any, originator?: any} = {};

        if ('add' in details) {
          update.added = this._restore(details.add);
        }
        if ('remove' in details) {
          update.removed = this._restore(details.remove);
        }
        update.originator = details.originatorId === this._particleId;
        await particle.callOnHandleUpdate(this, update, e => this.reportUserExceptionInHost(e, particle, 'onHandleUpdate'));
        return;
      }
      case 'desync':
        await particle.callOnHandleDesync(this, e => this.reportUserExceptionInHost(e, particle, 'onHandleUpdate'));
        return;
      default:
        throw new Error('unsupported');
    }
  }

  /**
   * Returns the Entity specified by id contained by the handle, or null if this id is not
   * contained by the handle.
   * @throws {Error} if this handle is not configured as a readable handle (i.e. 'reads' or 'reads writes')
   * in the particle's manifest.
   */
  async get(id: string) {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    return this._restore([await this.storage.get(id)])[0];
  }

  /**
   * @returns a list of the Entities contained by the handle.
   * @throws {Error} if this handle is not configured as a readable handle (i.e. 'reads' or 'reads writes')
   * in the particle's manifest.
   */
  async toList() {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    return this._restore(await this.storage.toList());
  }

  _restore(list) {
    if (list == null) {
      return null;
    }
    const containedType = this.type.getContainedType();
    if (containedType instanceof EntityType) {
      return list.map(e => restore(e, this.entityClass));
    }
    if (containedType instanceof ReferenceType) {
      return list.map(r => HandleOld.makeReference(r.rawData, containedType, this.storage.pec));
    }
    throw new Error(`Don't know how to deliver handle data of type ${this.type}`);
  }

  /**
   * Stores a new entity into the Handle.
   * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async store(entity: Storable) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const serialization = this._serialize(entity);
    const keys = [this.generateKey()];
    return this.storage.store(serialization, keys, this._particleId);
  }

  /**
   * For compatibility with the NG handle.
   */
  async add(entity: Storable) {
    return this.store(entity);
  }

  async addFromData(entityData) {
    const entity = new this.entityClass(entityData);
    await this.add(entity);
    return entity;
  }

  async addMultipleFromData(entityData) {
    return await Promise.all(entityData.map(e => this.addFromData(e)));
  }

  /**
   * Removes all known entities from the Handle.
   * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    if (this.storage.clear) {
      return this.storage.clear(this._particleId);
    } else {
      throw new Error('clear not implemented by storage');
    }
  }

  /**
   * Removes an entity from the Handle.
   * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async remove(entity: Storable) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const serialization = this._serialize(entity);
    // Remove the keys that exist at storage/proxy.
    const keys = [];
    await this.storage.remove(serialization.id, keys, this._particleId);
  }

  get storage(): Readonly<CollectionStore> {
    return this._storage;
  }
}

/**
 * A handle on a single entity. A particle's manifest dictates
 * the types of handles that need to be connected to that particle, and
 * the current recipe identifies which handles are connected.
 */
export class Singleton extends HandleOld {
  protected _storage: SingletonStore;
  // Called by StorageProxy.
  async _notify(kind: string, particle: Particle, details) {
    assert(this.canRead, '_notify should not be called for non-readable handles');
    switch (kind) {
      case 'sync':
        await particle.callOnHandleSync(this, this._restore(details), e => this.reportUserExceptionInHost(e, particle, 'onHandleSync'));
        return;
      case 'update': {
        const data = this._restore(details.data);
        await particle.callOnHandleUpdate(this, {data}, e => this.reportUserExceptionInHost(e, particle, 'onHandleUpdate'));
        return;
      }
      case 'desync':
        await particle.callOnHandleDesync(this, e => this.reportUserExceptionInHost(e, particle, 'onHandleDesync'));
        return;
      default:
        throw new Error('unsupported');
    }
  }

  /**
   * @returns the Entity contained by the Singleton, or undefined if the Singleton is cleared.
   * @throws {Error} if this Singleton is not configured as a readable handle (i.e. 'reads' or 'reads writes')
   * in the particle's manifest.
   */
  async get() {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const model = await this.storage.get();
    return this._restore(model);
  }

  _restore(model) {
    if (model == null) {
      return null;
    }
    if (this.type instanceof EntityType) {
      return restore(model, this.entityClass);
    }
    if (this.type instanceof InterfaceType) {
      return ParticleSpec.fromLiteral(model);
    }
    if (this.type instanceof ReferenceType) {
      return HandleOld.makeReference(model.rawData, this.type, this.storage.pec);
    }
    throw new Error(`Don't know how to deliver handle data of type ${this.type}`);
  }

  /**
   * Stores a new entity into the Singleton, replacing any existing entity.
   * @throws {Error} if this Singleton is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async set(entity: Storable) {
    try {
      if (!this.canWrite) {
        throw new Error('Handle not writeable');
      }
      const serialization = this._serialize(entity);
      return this.storage.set(serialization, this._particleId);
    } catch (e) {
      this.reportSystemExceptionInHost(e, 'Handle::set');
      throw e;
    }
  }

  async setFromData(entityData) {
    const entity = new this.entityClass(entityData);
    await this.set(entity);
    return entity;
  }

  /**
   * Clears any entity currently in the Singleton.
   * @throws {Error} if this Singleton is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async clear() {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    return this.storage.clear(this._particleId);
  }


  get storage(): Readonly<SingletonStore> {
    return this._storage;
  }
}

/**
 * Provides paginated read access to a BigCollection. Conforms to the javascript iterator protocol
 * but is not marked as iterable because next() is async, which is currently not supported by
 * implicit iteration in Javascript.
 */
class Cursor {
  private readonly _parent: BigCollection;
  private readonly _cursorId: number;

  constructor(parent: BigCollection, cursorId: number) {
    this._parent = parent;
    this._cursorId = cursorId;
  }

  /**
   * Returns {value: [items], done: false} while there are items still available, or {done: true}
   * when the cursor has completed reading the collection.
   */
  async next() {
    const data = await this._parent.storage.cursorNext(this._cursorId);
    if (!data.done) {
      data.value = data.value.map(a => restore(a as SerializedEntity, this._parent.entityClass));
    }
    return data;
  }

  /**
   * Terminates the streamed read. This must be called if a cursor is no longer needed but has not
   * yet completed streaming (i.e. next() hasn't returned {done: true}).
   */
  close() {
    this._parent.storage.cursorClose(this._cursorId);
  }
}

/**
 * A handle on a large set of Entity data. Similar to Collection, except the complete set of
 * entities is not available directly; use stream() to read the full set. Particles wanting to
 * operate on BigCollections should do so in the setHandles() call, since BigCollections do not
 * trigger onHandleSync() or onHandleUpdate().
 */
export class BigCollection extends HandleOld {
  protected _storage: BigCollectionStore;

  configure(options) {
    throw new Error('BigCollections do not support sync/update configuration');
  }

  async _notify(kind: string, particle: Particle, details) {
    assert(this.canRead, '_notify should not be called for non-readable handles');
    assert(kind === 'sync', 'BigCollection._notify only supports sync events');
    await particle.callOnHandleSync(this, [], e => this.reportUserExceptionInHost(e, particle, 'onHandleSync'));
  }

  /**
   * Stores a new entity into the Handle.
   * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async store(entity: Storable) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const serialization = this._serialize(entity);
    const keys = [this.generateKey()];
    return this.storage.store(serialization, keys, this._particleId);
  }

  /**
   * Removes an entity from the Handle.
   * @throws {Error} if this handle is not configured as a writeable handle (i.e. 'writes' or 'reads writes')
   * in the particle's manifest.
   */
  async remove(entity: Entity) {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const serialization = this._serialize(entity);
    await this.storage.remove(serialization.id, [], this._particleId);
  }

  /**
   * @returns a Cursor instance that iterates over the full set of entities, reading `pageSize`
   * entities at a time. The cursor views a snapshot of the collection, locked to the version
   * at which the cursor is created.
   *
   * By default items are returned in order of original insertion into the collection (with the
   * caveat that items removed during a streamed read may be returned at the end). Set `forward`
   * to false to return items in reverse insertion order.
   *
   * @throws {Error} if this Singleton is not configured as a readable handle (i.e. 'reads' or 'reads writes')
   * in the particle's manifest.
   */
  async stream({pageSize, forward = true}: {pageSize: number, forward: boolean}) {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    if (isNaN(pageSize) || pageSize < 1) {
      throw new Error('Streamed reads require a positive pageSize');
    }
    const cursorId = await this.storage.stream(pageSize, forward);
    return new Cursor(this, cursorId);
  }

  get storage(): Readonly<BigCollectionStore> {
    return this._storage;
  }
}

export function handleFor(storage: Store, idGenerator: IdGenerator, name: string = null, particleId = '', canRead = true, canWrite = true): HandleOld {
  let handle: Handle;
  if (storage.type instanceof CollectionType) {
    handle = new Collection(storage, idGenerator, name, particleId, canRead, canWrite);
  } else if (storage.type instanceof BigCollectionType) {
    handle = new BigCollection(storage, idGenerator, name, particleId, canRead, canWrite);
  } else {
    handle = new Singleton(storage, idGenerator, name, particleId, canRead, canWrite);
  }

  const schema = storage.type.getEntitySchema();
  if (schema) {
    handle.entityClass = Entity.createEntityClass(schema, storage.pec);
  }
  return handle;
}

/** Creates either a new- or old-style Handle for the given storage proxy. */
export function unifiedHandleFor(opts: {
    proxy: Store|StorageProxyNG<CRDTTypeRecord>,
    idGenerator: IdGenerator,
    name?: string,
    particleId?: string,
    particle?: Particle,
    canRead?: boolean,
    canWrite?: boolean}) {
  const defaultOpts = {particleId: '', canRead: true, canWrite: true};
  opts = {...defaultOpts, ...opts};
  if (opts.proxy instanceof StorageProxyNG) {
    if (opts.canWrite) {
      assert(opts.particleId.length, 'writeable NG Handles require a particle ID');
    }
    return handleNGFor(
        opts.particleId,
        opts.proxy,
        opts.idGenerator,
        opts.particle,
        opts.canRead,
        opts.canWrite,
        opts.name);
  } else {
    return handleFor(opts.proxy,
        opts.idGenerator,
        opts.name,
        opts.particleId,
        opts.canRead,
        opts.canWrite);
  }
}
