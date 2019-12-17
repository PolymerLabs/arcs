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
import {Entity, EntityClass, SerializedEntity} from '../entity.js';
import {IdGenerator, Id} from '../id.js';
import {EntityType, Type} from '../type.js';
import {StorageProxy, NoOpStorageProxy} from './storage-proxy.js';
import {SYMBOL_INTERNALS} from '../symbols.js';
import {ParticleSpec} from '../particle-spec.js';

export interface HandleOptions {
  keepSynced: boolean;
  notifySync: boolean;
  notifyUpdate: boolean;
  notifyDesync: boolean;
}

interface Serializer<T, Serialized> {
  serialize(value: T): Serialized;
  deserialize(value: Serialized): T;
  ensureHasId(value: T);
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
  // tslint:disable-next-line no-any
  protected serializer: Serializer<any, Referenceable>;

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

  toManifestString(): string {
    return `'${this._id}'`;
  }

  get entityClass(): EntityClass {
    if (this.type instanceof EntityType) {
      return Entity.createEntityClass(this.type.entitySchema, null);
    }
    const containedType = this.type.getContainedType();
    if (containedType instanceof EntityType) {
      return Entity.createEntityClass(containedType.entitySchema, null);
    }
    return null;
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
    // TODO(shans): Be more principled about how to determine whether this is an
    // immediate mode handle or a standard handle.
    if (this.type instanceof EntityType) {
      this.serializer = new PreEntityMutationSerializer(this.type, (e) => this.createIdentityFor(e));
    } else if (this.type.getContainedType() instanceof EntityType) {
      this.serializer = new PreEntityMutationSerializer(this.type.getContainedType(), (e) => this.createIdentityFor(e));
    } else {
      this.serializer = new ImmediateSerializer(()=>this.idGenerator.newChildId(Id.fromString(this._id)).toString());
    }
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

  abstract onUpdate(update: StorageType['operation'], version: VersionMap): void;
  abstract onSync(): void;

  async onDesync(): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      await this.particle.callOnHandleDesync(
          this,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleDesync'));
    }
  }

  disable(particle?: Particle) {
    this.storageProxy.deregisterHandle(this);
    this.storageProxy = new NoOpStorageProxy();
  }
}

/**
 * This serializer allows particles to manipulate collections and singletons of Entities
 * before the Entity Mutation API (and CRDT stack) is live. Once entity mutation is
 * available then this class will be deprecated and removed, and CollectionHandle / SingletonHandle
 * will become wrappers that reconstruct collections from a collection of references and
 * multiple entity stacks.
 */
class PreEntityMutationSerializer implements Serializer<Entity, SerializedEntity> {
  entityClass: EntityClass;
  createIdentityFor: (entity: Entity) => void;

  constructor(type: Type, createIdentityFor: (entity: Entity) => void) {
    if (type instanceof EntityType) {
      this.entityClass = Entity.createEntityClass(type.entitySchema, null);
      this.createIdentityFor = createIdentityFor;
     } else {
       throw new Error(`can't construct handle for entity mutation if type is not an entity type`);
     }
  }

  serialize(entity: Entity): SerializedEntity {
    const serialization = entity[SYMBOL_INTERNALS].serialize();
    return serialization;
  }

  ensureHasId(entity: Entity) {
    if (!Entity.isIdentified(entity)) {
      this.createIdentityFor(entity);
    }
  }

  deserialize(value: SerializedEntity): Entity {
    const {id, rawData} = value;
    const entity = new this.entityClass(rawData);
    Entity.identify(entity, id);
    return entity;
  }
}

/* Pass through the object to the storage stack, checking that it has an ID. */
// tslint:disable-next-line no-any
class ImmediateSerializer implements Serializer<ParticleSpec, Referenceable> {
  createIdentityFor: () => string;

  constructor(createIdentityFor: () => string) {
    this.createIdentityFor = createIdentityFor;
  }

  serialize(value) {
    // TODO(shanestephens): There should be IDs for particleSpecs that we use here at some point.
    const id = value.id? value.id : this.createIdentityFor();
    return {id, rawData: value};
  }

  ensureHasId(vlue) {
    // ID is checked in serialize method.
  }

  deserialize(value)  {
    return ParticleSpec.fromLiteral(value.rawData);
  }
}

/**
 * A handle on a set of Entity data. Note that, as a set, a Collection can only
 * contain a single version of an Entity for each given ID. Further, no order is
 * implied by the set.
 */
// TODO(shanestephens): we can't guarantee the safety of this stack (except by the Type instance matching) - do we need the T
// parameter here?
export class CollectionHandle<T> extends Handle<CRDTCollectionTypeRecord<Referenceable>> {
  async get(id: string): Promise<T> {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const values: Referenceable[] = await this.toCRDTList();
    return this.serializer.deserialize(values.find(element => element.id === id)) as T;
  }

  async add(entity: T): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    this.serializer.ensureHasId(entity);

    this.clock[this.key] = (this.clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: CollectionOpTypes.Add,
      added: this.serializer.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async addMultiple(entities: T[]): Promise<boolean> {
    return Promise.all(entities.map(e => this.add(e))).then(array => array.every(Boolean));
  }

  async remove(entity: T): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const op: CRDTOperation = {
      type: CollectionOpTypes.Remove,
      removed: this.serializer.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const values: Referenceable[] = await this.toCRDTList();
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
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const list = await this.toCRDTList();
    return list.map(entry => this.serializer.deserialize(entry) as T);
  }

  private async toCRDTList(): Promise<Referenceable[]> {
    const [set, versionMap] = await this.storageProxy.getParticleView();
    this.clock = versionMap;
    return [...set];
  }

  async onUpdate(op: CollectionOperation<Referenceable>, version: VersionMap): Promise<void> {
    assert(this.canRead, 'onUpdate should not be called for non-readable handles');
    this.clock = version;
    // FastForward cannot be expressed in terms of ordered added/removed, so pass a full model to
    // the particle.
    if (op.type === CollectionOpTypes.FastForward) {
      return this.onSync();
    }
    // Pass the change up to the particle.
    const update: {added?: Entity, removed?: Entity, originator: boolean} = {originator: ('actor' in op && this.key === op.actor)};
    if (op.type === CollectionOpTypes.Add) {
      update.added = this.serializer.deserialize(op.added);
    }
    if (op.type === CollectionOpTypes.Remove) {
      update.removed = this.serializer.deserialize(op.removed);
    }
    if (this.particle) {
      await this.particle.callOnHandleUpdate(
          this /*handle*/,
          update,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
    }
  }

  async onSync(): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      await this.particle.callOnHandleSync(
          this /*handle*/,
          await this.toList() /*model*/,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'));
    }
  }
}

/**
 * A handle on a single entity.
 */
export class SingletonHandle<T> extends Handle<CRDTSingletonTypeRecord<Referenceable>> {
  async set(entity: T): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    this.serializer.ensureHasId(entity);

    this.clock[this.key] = (this.clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: SingletonOpTypes.Set,
      value: this.serializer.serialize(entity),
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async clear(): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const op: CRDTOperation = {
      type: SingletonOpTypes.Clear,
      actor: this.key,
      clock: this.clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async get(): Promise<T> {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const [value, versionMap] = await this.storageProxy.getParticleView();
    this.clock = versionMap;
    return value == null ? null : this.serializer.deserialize(value) as T;
  }

  async onUpdate(op: SingletonOperation<Referenceable>, version: VersionMap): Promise<void> {
    assert(this.canRead, 'onUpdate should not be called for non-readable handles');
    this.clock = version;
    // Pass the change up to the particle.
    const update: {data?: Entity, originator: boolean} = {originator: (this.key === op.actor)};
    if (op.type === SingletonOpTypes.Set) {
      update.data = this.serializer.deserialize(op.value);
    }
    // Nothing else to add (beyond oldData) for SingletonOpTypes.Clear.
    if (this.particle) {
      await this.particle.callOnHandleUpdate(
          this /*handle*/,
          update,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
    }
  }

  async onSync(): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      await this.particle.callOnHandleSync(
          this /*handle*/,
          await this.get() /*model*/,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'));
    }
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
