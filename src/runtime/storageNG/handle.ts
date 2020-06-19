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
import {CRDTOperation, CRDTTypeRecord} from '../crdt/crdt.js';
import {CollectionOperation, CollectionOpTypes, CRDTCollectionTypeRecord, Referenceable} from '../crdt/crdt-collection.js';
import {CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../crdt/crdt-singleton.js';
import {Particle} from '../particle.js';
import {Entity, EntityClass, SerializedEntity} from '../entity.js';
import {IdGenerator, Id} from '../id.js';
import {EntityType, Type, ReferenceType} from '../type.js';
import {StorageProxy, NoOpStorageProxy} from './storage-proxy.js';
import {SYMBOL_INTERNALS} from '../symbols.js';
import {ParticleSpec} from '../particle-spec.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {Producer} from '../hot.js';
import {EntityOperation, RawEntity, Identified} from '../crdt/crdt-entity.js';
import {CRDTMuxEntity} from './storage-ng.js';

export interface HandleOptions {
  keepSynced: boolean;
  notifySync: boolean;
  notifyUpdate: boolean;
  notifyDesync: boolean;
}

interface Serializer<T, Serialized> {
  serialize(value: T): Serialized;
  deserialize(value: Serialized, storageKey: string): T;
  ensureHasId(value: T);
}

// The following must return a Reference, but we are trying to break the cyclic
// dependency between this file and reference.ts, so we lose a little bit of type safety
// to do that.
type ReferenceMaker = (data: {id: string, creationTimestamp?: number | null, expirationTimestamp?: number | null, entityStorageKey: string | null}, type: ReferenceType<EntityType>, context: ChannelConstructor) => ReferenceInt;

/**
 * Base class for Handles.
 */
// TODO(shans): reduce required interface for Particle argument so that it's just an event target for updates.
// TODO(shans): can actor("key" in constructor) always be automatically derived from idGenerator?
export abstract class Handle<StorageType extends CRDTTypeRecord> {
  storageProxy: StorageProxy<StorageType>;
  key: string;
  private readonly idGenerator: IdGenerator;
  options: HandleOptions;
  readonly canRead: boolean;
  readonly canWrite: boolean;
  particle: Particle;
  // Optional, for debugging purpose.
  readonly name: string;
  // tslint:disable-next-line no-any
  protected serializer: Serializer<any, Referenceable>;
  // This function is set from reference.ts, to avoid creating a compile-time import cycle.
  static makeReference: ReferenceMaker;

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
    Entity.createIdentity(entity, Id.fromString(this._id), this.idGenerator, this.storageProxy.storageKey, this.storageProxy.ttl);
  }

  toManifestString(): string {
    return `'${this._id}'`;
  }

  get entityClass(): EntityClass {
    if (this.type instanceof EntityType) {
      return Entity.createEntityClass(this.type.entitySchema, this.storageProxy.getChannelConstructor());
    }
    const containedType = this.type.getContainedType();
    if (containedType instanceof EntityType) {
      return Entity.createEntityClass(containedType.entitySchema, this.storageProxy.getChannelConstructor());
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

    // TODO(shans): Be more principled about how to determine whether this is an
    // immediate mode handle or a standard handle.
    if (this.type instanceof EntityType) {
      this.serializer = new PreEntityMutationSerializer(this.type, (e) => {this.createIdentityFor(e);}, this.storageProxy.getChannelConstructor());
    } else if (this.type.getContainedType() instanceof EntityType) {
      this.serializer = new PreEntityMutationSerializer(this.type.getContainedType(), (e) => {this.createIdentityFor(e);}, this.storageProxy.getChannelConstructor());
    } else if (this.type.getContainedType() instanceof ReferenceType) {
      this.serializer = new ReferenceSerializer(this.type.getContainedType() as ReferenceType<EntityType>, this.storageProxy.getChannelConstructor());
    } else {
      this.serializer = new ParticleSpecSerializer(()=>this.idGenerator.newChildId(Id.fromString(this._id)).toString());
    }

    this.storageProxy.registerHandle(this);
  }

  // `options` may contain any of:
  // - keepSynced (bool): load full data on startup, maintain data in proxy and resync as required
  // - notifySync (bool): if keepSynced is true, call onHandleSync when the full data is received
  // - notifyUpdate (bool): if keepSynced is true, call onHandleUpdate for every change event received
  //     if the proxy is currently synchronized (i.e. updates received when desynced are ignored); if
  //     keepSynced is false, just notify for all updates
  // - notifyDesync (bool): if keepSynced is true, call onHandleDesync when desync is detected.
  configure(options: {keepSynced?: boolean, notifySync?: boolean, notifyUpdate?: boolean, notifyDesync?: boolean}): void {
    assert(this.canRead, 'configure can only be called on readable Handles');
    this.options = {...this.options, ...options};
  }

  protected reportUserExceptionInHost(exception: Error, particle: Particle, method: string) {
    this.storageProxy.reportExceptionInHost(new UserException(exception, method, this.key, particle.spec ? particle.spec.name : ''));
  }

  abstract onUpdate(update: StorageType['operation']): void;
  abstract onSync(model: StorageType['consumerType']): void;

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

  constructor(type: Type, createIdentityFor: (entity: Entity) => void, context: ChannelConstructor) {
    if (type instanceof EntityType) {
      this.entityClass = Entity.createEntityClass(type.entitySchema, context);
      this.createIdentityFor = createIdentityFor;
     } else {
       throw new Error(`can't construct handle for entity mutation if type is not an entity type`);
     }
  }

  serialize(entity: Entity): SerializedEntity {
    this.ensureHasId(entity);
    const serialization = entity[SYMBOL_INTERNALS].serialize();
    return serialization;
  }

  ensureHasId(entity: Entity) {
    if (!Entity.isIdentified(entity)) {
      this.createIdentityFor(entity);
    }
  }

  deserialize(value: SerializedEntity, storageKey: string): Entity {
    const {id, creationTimestamp, expirationTimestamp, rawData} = value;
    const entity = new this.entityClass(rawData);
    Entity.identify(entity, id, storageKey, creationTimestamp, expirationTimestamp);
    return entity;
  }
}

type ReferenceSer = {id: string, creationTimestamp?: number, expirationTimestamp?: number, entityStorageKey: string};
interface ReferenceInt {
  dataClone: Producer<ReferenceSer>;
}

class ReferenceSerializer implements Serializer<ReferenceInt, ReferenceSer> {
  constructor(private readonly type: ReferenceType<EntityType>, private readonly context: ChannelConstructor) {}

  serialize(reference: ReferenceInt): ReferenceSer {
    return reference.dataClone();
  }

  deserialize(value: ReferenceSer): ReferenceInt {
    return Handle.makeReference(value, this.type, this.context);
  }

  ensureHasId(reference: ReferenceInt) {
    // references must always have IDs
  }
}

/* Pass through the object to the storage stack, checking that it has an ID. */
// tslint:disable-next-line no-any
class ParticleSpecSerializer implements Serializer<ParticleSpec, Referenceable> {
  createIdentityFor: () => string;

  constructor(createIdentityFor: () => string) {
    this.createIdentityFor = createIdentityFor;
  }

  serialize(value: ParticleSpec) {
    // TODO(shanestephens): There should be IDs for particleSpecs that we use here at some point.
    const id = this.createIdentityFor();
    return {id, rawData: value.toLiteral()};
  }

  ensureHasId(entity) {
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
  async fetch(id: string): Promise<T> {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const values: Referenceable[] = await this.toCRDTList();
    return this.serializer.deserialize(values.find(element => element.id === id), this.storageProxy.storageKey) as T;
  }

  async add(entity: T): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    this.serializer.ensureHasId(entity);

    const clock = this.storageProxy.versionCopy();
    clock[this.key] = (clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: CollectionOpTypes.Add,
      added: this.serializer.serialize(entity),
      actor: this.key,
      clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async addFromData(entityData: {}): Promise<T> {
    const entity: T = new this.entityClass(entityData) as unknown as T;
    const result = await this.add(entity);
    return result ? entity : null;
  }

  async addMultiple(entities: T[]): Promise<boolean> {
    return Promise.all(entities.map(e => this.add(e))).then(array => array.every(Boolean));
  }

  async addMultipleFromData(entityData: {}[]): Promise<T[]> {
    return Promise.all(entityData.map(e => this.addFromData(e)));
  }

  async remove(entity: T): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    const op: CRDTOperation = {
      type: CollectionOpTypes.Remove,
      removed: this.serializer.serialize(entity),
      actor: this.key,
      clock: this.storageProxy.versionCopy(),
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
        clock: this.storageProxy.versionCopy(),
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
    return list.map(entry => this.serializer.deserialize(entry, this.storageProxy.storageKey) as T);
  }

  private async toCRDTList(): Promise<Referenceable[]> {
    return [...await this.storageProxy.getParticleView()];
  }

  async fetchAll(): Promise<Set<T>> {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const list = await this.toCRDTList();
    return new Set(list.map(entry => this.serializer.deserialize(entry, this.storageProxy.storageKey) as T));
  }

  /**
   * onUpdate, onSync and onDesync *are async functions*, because they invoke callOnHandleUpdate,
   * which is async.
   *
   * However, they *must not introduce await points* before invoking callOnHandleUpdate, as
   * if they do there is a risk that they will be reordered.
   */

  async onUpdate(op: CollectionOperation<Referenceable>): Promise<void> {
    assert(this.canRead, 'onUpdate should not be called for non-readable handles');
    // FastForward cannot be expressed in terms of ordered added/removed, so pass a full model to
    // the particle.
    if (op.type === CollectionOpTypes.FastForward) {
      return this.onSync(this.storageProxy.getParticleViewAssumingSynchronized());
    }
    // Pass the change up to the particle.
    const update: {added?: Entity[], removed?: Entity[], originator: boolean} = {originator: ('actor' in op && this.key === op.actor)};
    if (op.type === CollectionOpTypes.Add) {
      update.added = [this.serializer.deserialize(op.added, this.storageProxy.storageKey)];
    }
    if (op.type === CollectionOpTypes.Remove) {
      update.removed = [this.serializer.deserialize(op.removed, this.storageProxy.storageKey)];
    }
    if (this.particle) {
      await this.particle.callOnHandleUpdate(
          this /*handle*/,
          update,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
    }
  }

  async onSync(model: CRDTCollectionTypeRecord<Referenceable>['consumerType']): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      await this.particle.callOnHandleSync(
          this /*handle*/,
          [...model].map(entry => this.serializer.deserialize(entry, this.storageProxy.storageKey)),
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

    const clock = this.storageProxy.versionCopy();
    clock[this.key] = (clock[this.key] || 0) + 1;
    const op: CRDTOperation = {
      type: SingletonOpTypes.Set,
      value: this.serializer.serialize(entity),
      actor: this.key,
      clock,
    };
    return this.storageProxy.applyOp(op);
  }

  async setFromData(entityData: {}): Promise<T> {
    const entity: T = new this.entityClass(entityData) as unknown as T;
    const result = await this.set(entity);
    return result ? entity : null;
  }

  async clear(): Promise<boolean> {
    if (!this.canWrite) {
      throw new Error('Handle not writeable');
    }
    // Sync the proxy before clearing in order to ensure we can clear values set by other actors.
    // TODO: if we expose wether the storage proxy is synchronized to the handle,
    // we could avoid introducing an unnecessary await here.
    await this.storageProxy.getParticleView();

    // Issue clear op.
    const op: CRDTOperation = {
      type: SingletonOpTypes.Clear,
      actor: this.key,
      clock: this.storageProxy.versionCopy(),
    };
    return this.storageProxy.applyOp(op);
  }

  async fetch(): Promise<T> {
    if (!this.canRead) {
      throw new Error('Handle not readable');
    }
    const value = await this.storageProxy.getParticleView();
    return value == null ? null : this.serializer.deserialize(value, this.storageProxy.storageKey) as T;
  }

  /**
   * onUpdate, onSync and onDesync *are async functions*, because they invoke callOnHandleUpdate,
   * which is async.
   *
   * However, they *must not introduce await points* before invoking callOnHandleUpdate, as
   * if they do there is a risk that they will be reordered.
   */

   async onUpdate(op: SingletonOperation<Referenceable>): Promise<void> {
    assert(this.canRead, 'onUpdate should not be called for non-readable handles');
    // Pass the change up to the particle.
    const update: {data?: Entity, originator: boolean} = {originator: (this.key === op.actor)};
    if (op.type === SingletonOpTypes.Set) {
      update.data = this.serializer.deserialize(op.value, this.storageProxy.storageKey);
    }
    // Nothing else to add (beyond oldData) for SingletonOpTypes.Clear.
    if (this.particle) {
      await this.particle.callOnHandleUpdate(
          this /*handle*/,
          update,
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleUpdate'));
    }
  }

  async onSync(model: CRDTSingletonTypeRecord<Referenceable>['consumerType']): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      await this.particle.callOnHandleSync(
          this /*handle*/,
          model == null ? model : this.serializer.deserialize(model, this.storageProxy.storageKey),
          e => this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'));
    }
  }
}

/**
 * A handle on an entity.
 */
export class EntityHandle<T> extends Handle<CRDTMuxEntity> {
  constructor(
    key: string,
    storageProxy: StorageProxy<CRDTMuxEntity>,
    idGenerator: IdGenerator,
    particle: Particle,
    canRead: boolean,
    canWrite: boolean,
    public muxId: string,
    name?: string
  ) {
    super(key, storageProxy, idGenerator, particle, canRead, canWrite, name);
  }

  async fetch(): Promise<T> {
    const value = await this.storageProxy.getParticleView();
    if (value == null) {
      return null;
    }
    const serializedEntity = this.createSerializedEntity(value);
    return this.serializer.deserialize(serializedEntity, this.storageProxy.storageKey);
  }

  createSerializedEntity(rawEntity: RawEntity<Identified, Identified>): SerializedEntity {
    const serializedEntity = {id: this.muxId, rawData: {}} as SerializedEntity;

    // For primitives, only the value propery of the Referenceable should be included in the rawData of the serializedEntity.
    for (const [key, value] of Object.entries(rawEntity.singletons)) {
      if (value['value'] !== undefined) {
        serializedEntity.rawData[key] = value['value'];
      } else {
        serializedEntity.rawData[key] = value;
      }
    }
    for (const [key, value] of Object.entries(rawEntity.collections)) {
      serializedEntity.rawData[key] = new Set();
      for (const elem of value.values()) {
        if (elem['value'] !== undefined) {
          serializedEntity.rawData[key].add(elem['value']);
        } else {
          serializedEntity.rawData[key].add(elem);
        }
      }
    }
    return serializedEntity;
  }

  onUpdate(update: EntityOperation<Identified, Identified>): void {
    throw new Error('Method not implemented yet.');
  }

  async onSync(model: RawEntity<Identified, Identified>): Promise<void> {
    assert(this.canRead, 'onSync should not be called for non-readable handles');
    if (this.particle) {
      const serializedEntity = this.createSerializedEntity(model);
      await this.particle.callOnHandleSync(
        this,
        model == null ? model : this.serializer.deserialize(serializedEntity, this.storageProxy.storageKey),
        e => { this.reportUserExceptionInHost(e, this.particle, 'onHandleSync'); }
      );
    }
  }
}
