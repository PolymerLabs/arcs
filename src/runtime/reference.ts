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
import {CollectionHandle, Handle, handleNGFor} from './storageNG/handle.js';
import {ChannelConstructor} from './channel-constructor.js';
import {CRDTTypeRecord} from './crdt/crdt.js';

enum ReferenceMode {Unstored, Stored}

export type SerializedReference = {
  id: string;
  entityStorageKey: string;
};

export class Reference implements Storable {
  public entity: Entity|null = null;
  public type: ReferenceType;

  protected readonly id: string;
  private entityStorageKey: string;
  private readonly context: ChannelConstructor;
  private storageProxy: StorageProxy<CRDTTypeRecord> = null;
  protected handle: CollectionHandle<Entity>|null = null;

  [SYMBOL_INTERNALS]: {serialize: () => SerializedEntity};

  constructor(data: {id: string, entityStorageKey: string | null}, type: ReferenceType, context: ChannelConstructor) {
    this.id = data.id;
    this.entityStorageKey = data.entityStorageKey;
    this.context = context;
    this.type = type;
    this[SYMBOL_INTERNALS] = {
      serialize: () => ({id: this.id, rawData: this.dataClone()})
    };
  }

  protected async ensureStorageProxy(): Promise<void> {
    if (this.storageProxy == null) {
      this.storageProxy = await this.context.getStorageProxy(this.entityStorageKey, this.type.referredType);
      this.handle = handleNGFor(this.context.generateID(), this.storageProxy, this.context.idGenerator, null, true, true) as CollectionHandle<Entity>;
      if (this.entityStorageKey) {
        assert(this.entityStorageKey === this.storageProxy.storageKey, `reference's storageKey differs from the storageKey of established channel.`);
      } else {
        this.entityStorageKey = this.storageProxy.storageKey;
      }
    }
  }

  async dereference(): Promise<Entity|null> {
    assert(this.context, 'Must have context to dereference');

    if (this.entity) {
      return this.entity;
    }

    await this.ensureStorageProxy();

    this.entity = await this.handle.fetchAll(this.id);
    return this.entity;
  }

  dataClone(): SerializedReference {
    return {entityStorageKey: this.entityStorageKey, id: this.id};
  }

  // Called by WasmParticle to retrieve the entity for a reference held in a wasm module.
  static async retrieve(pec: ChannelConstructor, id: string, storageKey: string, entityType: EntityType, particleId: string) {
    const proxy = await pec.getStorageProxy(storageKey, entityType);
    const handle = handleNGFor(particleId, proxy, pec.idGenerator, null, true, true) as CollectionHandle<Entity>;
    return await handle.fetchAll(id);
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
    await this.ensureStorageProxy();
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
function makeReference(data: {id: string, entityStorageKey: string | null}, type: ReferenceType, context: ChannelConstructor): Reference {
 return new Reference(data, type, context);
}

Handle.makeReference = makeReference;
