/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {UserException} from '../arc-exceptions.js';
import {CRDTOperation, CRDTTypeRecord, VersionMap} from '../crdt/crdt.js';
import {CollectionOperation, CollectionOpTypes, CRDTCollectionTypeRecord, Referenceable} from '../crdt/crdt-collection.js';
import {CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../crdt/crdt-singleton.js';
import {Particle} from '../particle.js';
import {Entity, EntityClass} from '../entity.js';
import {IdGenerator, Id} from '../id.js';
import {EntityType, Type} from '../type.js';
import {StorageProxy, NoOpStorageProxy} from './storage-proxy.js';
import {Storable} from '../handle.js';
import {SYMBOL_INTERNALS} from '../symbols.js';
import {SerializedEntity} from '../storage-proxy.js';

export interface HandleOptions {
  keepSynced: boolean;
  notifySync: boolean;
  notifyUpdate: boolean;
  notifyDesync: boolean;
}

/**
 * Base class for Handles.
 */
export abstract class Handle<StorageType extends CRDTTypeRecord> {
  storageProxy: StorageProxy<StorageType>;
  key: string;
  private readonly idGenerator: IdGenerator;
  protected clock: VersionMap;
  options: HandleOptions;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  particle: Particle;
  // Optional, for debugging purpose.
  readonly name: string;

  //TODO: this is used by multiplexer-dom-particle.ts, it probably won't work with this kind of store.
  get storage() {
    return this.storageProxy;
  }

  get type(): Type {
    return this.storageProxy.type;
  }

  // TODO: after NG migration, this can be renamed to something like "apiChannelId()".
  get _id(): string {
    return this.storageProxy.apiChannelId;
  }

  createIdentityFor(entity: Entity) {
    Entity.createIdentity(entity, Id.fromString(this._id), this.idGenerator);
  }

  constructor(
      key: string,
      storageProxy: StorageProxy<StorageType>,
      idGenerator: IdGenerator,
      particle: Particle,
      canRead: boolean,
      canWrite: boolean,
      name?: string) {
    this.key = key;
    this.name = name;
    this.storageProxy = storageProxy;
    this.idGenerator = idGenerator;
    this.particle = particle;
    this.options = {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    };
    this.canRead = canRead;
    this.canWrite = canWrite;

    this.clock = this.storageProxy.registerHandle(this);
  }

  // `options` may contain any of:
  // - keepSynced (bool): load full data on startup, maintain data in proxy and resync as required
  // - notifySync (bool): if keepSynced is true, call onHandleSync when the full data is received
  // - notifyUpdate (bool): call onHandleUpdate for every change event received
  // - notifyDesync (bool): if keepSynced is true, call onHandleDesync when desync is detected
  configure(options: {keepSynced?: boolean, notifySync?: boolean, notifyUpdate?: boolean, notifyDesync?: boolean}): void {
    assert(this.canRead, 'configure can only be called on readable Handles');
    this.options = {...this.options, ...options};
  }

  protected reportUserExceptionInHost(exception: Error, particle: Particle, method: string) {
    this.storageProxy.reportExceptionInHost(new UserException(exception, method, this.key, particle.spec.name));
  }

  abstract onUpdate(update: StorageType['operation'], oldData: StorageType['consumerType'], version: VersionMap): void;
  abstract onSync(): void;

  async onDesync(): Promise<void> {
    await this.particle.callOnHandleDesync(
        this,
        e => this.reportUserExceptionInHost(e, this.particle, 'onHandleDesync'));
  }

  disable(particle?: Particle) {
    this.storageProxy.deregisterHandle(this);
    this.storageProxy = new NoOpStorageProxy();
  }
}

/**
 * This handle class allows particles to manipulate collections and singletons of Entities
 * before the Entity Mutation API (and CRDT stack) is live. Once entity mutation is
 * available then this class will be deprecated and removed, and CollectionHandle / SingletonHandle
 * will become wrappers that reconstruct collections from a collection of references and
 * multiple entity stacks.
 */
export abstract class PreEntityMutationHandle<T extends CRDTTypeRecord> extends Handle<T> {
  entityClass: EntityClass;

  constructor(key: string, storageProxy: StorageProxy<T>, idGenerator: IdGenerator,
              particle: Particle, canRead: boolean, canWrite: boolean, name?: string) {
    super(key, storageProxy, idGenerator, particle, canRead, canWrite, name);

    const type = this.storageProxy.type.getContainedType() || this.storageProxy.type;
    if (type instanceof EntityType) {
      this.entityClass = type.entitySchema.entityClass();
    } else {
      throw new Error(`can't construct handle for entity mutation if type is not an entity type`);
    }
  }

  protected serialize(entity: Entity): SerializedEntity {
    const serialization = entity[SYMBOL_INTERNALS].serialize();
    return serialization;
  }

  protected ensureEntityHasId(entity: Entity) {
    if (!Entity.isIdentified(entity)) {
      this.createIdentityFor(entity);
    }
  }

  protected deserialize(value: SerializedEntity): Entity {
    const {id, rawData} = value;
    const entity = new this.entityClass(rawData);
    Entity.identify(entity, id);
    return entity;
  }
}

/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set.
 */
// TODO(shanestephens): we can't guarantee the safety of this stack (except by the Type instance matching) - do we need the T
// parameter here?
export class CollectionHandle<T extends Entity> extends PreEntityMutationHandle<CRDTCollectionTypeRecord<SerializedEntity>> {
  async get(id: string): Promise<T> {
    const values: SerializedEntity[] = await this.toCRDTList();
    return this.deserialize(values.find(element => element.id === id)) as T;
  }

  async add(entity: T): Promise<boolean> {
    this.ensureEntityHasId(entity);

    this.clock[this.key] = (this.clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: CollectionOpTypes.Add,
      added: this.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async addMultiple(entities: T[]): Promise<boolean> {
    return Promise.all(entities.map(e => this.add(e))).then(array => array.every(Boolean));
  }

  async remove(entity: T): Promise<boolean> {
    const op: CRDTOperation = {
      type: CollectionOpTypes.Remove,
      removed: this.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    const values: SerializedEntity[] = await this.toCRDTList();
    for (const value of values) {
      const removeOp: CRDTOperation = {
        type: CollectionOpTypes.Remove,
        removed: value,
        actor: this.key,
        clock: this.clock,
      };
      if (!this.storageProxy.applyOp(removeOp)) {
        return false;
      }
    }
    return true;
  }

  async toList(): Promise<T[]> {
    const list = await this.toCRDTList();
    return list.map(entry => this.deserialize(entry) as T);
  }

  private async toCRDTList(): Promise<SerializedEntity[]> {
    const [set, versionMap] = await this.storageProxy.getParticleView();
    this.clock = versionMap;
    return [...set];
  }

  async onUpdate(op: CollectionOperation<SerializedEntity>, oldData: Set<SerializedEntity>, version: VersionMap): Promise<void> {
    this.clock = version;
    // FastForward cannot be expressed in terms of ordered added/removed, so pass a full model to
    // the particle.
    if (op.type === CollectionOpTypes.FastForward) {
      return this.onSync();
    }
    // Pass the change up to the particle.
    const update: {added?: Entity, removed?: Entity, originator: boolean} = {originator: ('actor' in op && this.key === op.actor)};
    if (op.type === CollectionOpTypes.Add) {
      update.added = this.deserialize(op.added);
    }
    if (op.type === CollectionOpTypes.Remove) {
      update.removed = this.deserialize(op.removed);
    }
    await this.particle.callOnHandleUpdate(
        this /*handle*/,
        update,
        e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
  }

  async onSync(): Promise<void> {
    await this.particle.callOnHandleSync(
        this /*handle*/,
        this.toList() /*model*/,
        e => this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'));
  }
}

/**
 * A handle on a single entity.
 */
export class SingletonHandle<T extends Entity> extends PreEntityMutationHandle<CRDTSingletonTypeRecord<SerializedEntity>> {
  async set(entity: T): Promise<boolean> {
    this.ensureEntityHasId(entity);

    this.clock[this.key] = (this.clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: SingletonOpTypes.Set,
      value: this.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    const op: CRDTOperation = {
      type: SingletonOpTypes.Clear,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async get(): Promise<T> {
    const [value, versionMap] = await this.storageProxy.getParticleView();
    this.clock = versionMap;
    return value == null ? null : this.deserialize(value) as T;
  }

  async onUpdate(op: SingletonOperation<SerializedEntity>, oldData: SerializedEntity, version: VersionMap): Promise<void> {
     this.clock = version;
    // Pass the change up to the particle.
    const update: {data?: Entity, oldData: SerializedEntity, originator: boolean} = {oldData, originator: (this.key === op.actor)};
    if (op.type === SingletonOpTypes.Set) {
      update.data = this.deserialize(op.value);
    }
    // Nothing else to add (beyond oldData) for SingletonOpTypes.Clear.
    await this.particle.callOnHandleUpdate(
        this /*handle*/,
        update,
        e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
  }

  async onSync(): Promise<void> {
    await this.particle.callOnHandleSync(
        this /*handle*/,
        this.get() /*model*/,
        e => this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'));
  }
}

export function handleNGFor<T extends CRDTTypeRecord>(key: string,
      storageProxy: StorageProxy<T>,
      idGenerator: IdGenerator,
      particle: Particle,
      canRead: boolean,
      canWrite: boolean,
      name?: string): Handle<T> {
  return new (storageProxy.type.handleConstructor<T>())(key,
          storageProxy,
          idGenerator,
          particle,
          canRead,
          canWrite,
          name);
}
