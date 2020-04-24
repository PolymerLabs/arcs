/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Storable} from './storable.js';
import {ReferenceType, EntityType} from './type.js';
import {Entity, SerializedEntity} from './entity.js';
import {StorageProxy} from './storageNG/storage-proxy.js';
import {SYMBOL_INTERNALS} from './symbols.js';
import {ChannelConstructor} from './channel-constructor.js';
import {CRDTEntityTypeRecord, Identified} from './crdt/crdt-entity.js';
import {EntityHandle, Handle} from './storageNG/handle.js';
import {BackingStorageProxy} from './storageNG/backing-storage-proxy.js';
import {StorageKeyParser} from './storageNG/storage-key-parser.js';
import {ReferenceModeStorageKey} from './storageNG/reference-mode-storage-key.js';

enum ReferenceMode {Unstored, Stored}

export type SerializedReference = {
  id: string;
  entityStorageKey: string;
  // TODO(#4861): creationTimestamp shouldn't be optional.
  creationTimestamp?: number;
  expirationTimestamp?: number;
};

function toDate(timestamp?: Date|number): Date|null {
  if (timestamp == undefined) {
    return null;
  }
  if (typeof(timestamp) === 'number') {
    return new Date(timestamp);
  }
  return timestamp;
}

export class Reference implements Storable {
  public entity: Entity|null = null;
  public type: ReferenceType<EntityType>;

  public readonly id: string;
  private readonly creationTimestamp: Date|null;
  private readonly expirationTimestamp: Date|null;
  private entityStorageKey: string;
  private backingKey: string;
  private readonly context: ChannelConstructor;
  private storageProxy: StorageProxy<CRDTEntityTypeRecord<Identified, Identified>> = null;
  protected handle: EntityHandle<Entity>|null = null;

  [SYMBOL_INTERNALS]: {serialize: () => SerializedEntity};

  constructor(data: {id: string, creationTimestamp?: Date|number, expirationTimestamp?: Date|number, entityStorageKey: string | null}, type: ReferenceType<EntityType>, context: ChannelConstructor) {
    this.id = data.id;
    this.creationTimestamp = toDate(data.creationTimestamp);
    this.expirationTimestamp = toDate(data.expirationTimestamp);
    this.entityStorageKey = data.entityStorageKey;
    // abstract out the backing storage key from the entityStorageKey
    if (this.entityStorageKey == null) {
      throw Error('entity storage key must be defined');
    }
    const key = StorageKeyParser.parse(this.entityStorageKey);
    if (key instanceof ReferenceModeStorageKey) {
      this.backingKey = key.backingKey.toString();
    } else {
      throw Error('References must refrence an entity in ReferenceModeStore');
    }
    this.context = context;
    this.type = type;
    this[SYMBOL_INTERNALS] = {
      serialize: () => ({
        id: this.id,
        creationTimestamp: this.creationTimestamp ? this.creationTimestamp.getTime() : null,
        expirationTimestamp: this.expirationTimestamp ? this.expirationTimestamp.getTime() : null,
        rawData: this.dataClone()
      })
    };
  }

  protected async ensureBackingStorageProxy(): Promise<void> {
    if (this.storageProxy == null) {
      const backingStorageProxy = await this.context.getBackingStorageProxy(this.backingKey, this.type.referredType);
      this.storageProxy = backingStorageProxy.getStorageProxy(this.id);
      this.handle = new EntityHandle(this.context.generateID(), this.storageProxy, this.context.idGenerator, null, true, true, this.id);
    }
  }

  async dereference(): Promise<Entity|null> {
    assert(this.context, 'Must have context to dereference');

    if (this.entity) {
      return this.entity;
    }

    await this.ensureBackingStorageProxy();

    this.entity = await this.handle.fetch();
    return this.entity;
  }

  dataClone(): SerializedReference {
    return {
      entityStorageKey: this.entityStorageKey,
      id: this.id,
      creationTimestamp: this.creationTimestamp ? this.creationTimestamp.getTime() : null,
      expirationTimestamp: this.expirationTimestamp ? this.expirationTimestamp.getTime() : null
    };
  }

  // Called by WasmParticle to retrieve the entity for a reference held in a wasm module.
  static async retrieve(pec: ChannelConstructor, id: string, storageKey: string, entityType: EntityType, particleId: string) {
    const backingProxy = await pec.getBackingStorageProxy(storageKey, entityType) as BackingStorageProxy<CRDTEntityTypeRecord<Identified, Identified>>;
    const proxy = backingProxy.getStorageProxy(id);
    const handle = new EntityHandle<Entity>(particleId, proxy, pec.idGenerator, null, true, true, id);
    return await handle.fetch();
  }
}

/** A subclass of Reference that clients can create. */
export abstract class ClientReference extends Reference {
  private mode = ReferenceMode.Unstored;
  public stored: Promise<void>;

  /** Use the newClientReference factory method instead. */
  protected constructor(entity: Entity, context: ChannelConstructor) {
    // TODO(shans): start carrying storageKey information around on Entity objects
    super(
      {
        id: Entity.id(entity),
        creationTimestamp: Entity.creationTimestamp(entity),
        expirationTimestamp: Entity.expirationTimestamp(entity),
        entityStorageKey: Entity.storageKey(entity)
      },
      new ReferenceType(Entity.entityClass(entity).type),
      context
    );

    this.entity = entity;
    this.stored = Promise.resolve();
    this.mode = ReferenceMode.Stored;
  }

  async dereference(): Promise<Entity|null> {
    if (this.mode === ReferenceMode.Unstored) {
      return null;
    }
    await this.ensureBackingStorageProxy();
    return super.dereference();
  }

  isIdentified(): boolean {
    return Entity.isIdentified(this.entity);
  }

  static newClientReference(context: ChannelConstructor): typeof ClientReference {
    return class extends ClientReference {
      constructor(entity: Entity) {
        super(entity, context);
      }
    };
  }
}

/**
 * makeReference exists to break a cyclic dependency between handle.ts (both old and NG variants) and reference.ts.
 * Instead of statically depending on reference.ts, handle.ts defines a static makeReference method which is
 * dynamically populated here.
 */
function makeReference(data: {id: string, creationTimestamp?: number | null, expirationTimestamp?: number | null, entityStorageKey: string | null}, type: ReferenceType<EntityType>, context: ChannelConstructor): Reference {
  return new Reference({
    id: data.id,
    creationTimestamp: data.creationTimestamp ? new Date(data.creationTimestamp) : null,
    expirationTimestamp: data.expirationTimestamp ? new Date(data.expirationTimestamp) : null,
    entityStorageKey: data.entityStorageKey}, type, context);
}

Handle.makeReference = makeReference;
