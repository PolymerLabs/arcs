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
import {ReferenceType, EntityType} from '../types/lib-types.js';
import {Entity, SerializedEntity} from './entity.js';
import {StorageProxy} from './storage/storage-proxy.js';
import {SYMBOL_INTERNALS} from './symbols.js';
import {ChannelConstructor} from './channel-constructor.js';
import {CRDTEntityTypeRecord, Identified} from '../crdt/lib-crdt.js';
import {EntityHandle, Handle} from './storage/handle.js';
import {StorageProxyMuxer} from './storage/storage-proxy-muxer.js';
import {StorageKeyParser} from './storage/storage-key-parser.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';

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
    if (this.entityStorageKey == null) {
      throw Error('entity storage key must be defined');
    }
    this.backingKey = Reference.extractBackingKey(this.entityStorageKey);
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

  protected async ensureStorageProxyMuxer(): Promise<void> {
    if (this.storageProxy == null) {
      const storageProxyMuxer = await this.context.getStorageProxyMuxer(this.backingKey, this.type.referredType);
      this.storageProxy = storageProxyMuxer.getStorageProxy(this.id);
      this.handle = new EntityHandle(this.context.generateID(), this.storageProxy, this.context.idGenerator, null, true, true, this.id);
    }
  }

  async dereference(): Promise<Entity|null> {
    assert(this.context, 'Must have context to dereference');

    if (this.entity) {
      return this.entity;
    }

    await this.ensureStorageProxyMuxer();

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

  static extractBackingKey(storageKey: string): string {
    const key = StorageKeyParser.parse(storageKey);
    if (key instanceof ReferenceModeStorageKey) {
      return key.backingKey.toString();
    } else {
      throw Error('References must reference an entity in ReferenceModeStore');
    }
  }

  // Called by WasmParticle to retrieve the entity for a reference held in a wasm module.
  static async retrieve(channelConstructor: ChannelConstructor, id: string, storageKey: string, entityType: EntityType, particleId: string) {
    const storageProxyMuxer = await channelConstructor.getStorageProxyMuxer(this.extractBackingKey(storageKey), entityType) as StorageProxyMuxer<CRDTEntityTypeRecord<Identified, Identified>>;
    const proxy = storageProxyMuxer.getStorageProxy(id);
    const handle = new EntityHandle<Entity>(particleId, proxy, channelConstructor.idGenerator, null, true, true, id);
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
    await this.ensureStorageProxyMuxer();
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
