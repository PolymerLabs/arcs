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
import {handleFor, Collection, Storable} from './handle.js';
import {ParticleExecutionContext} from './particle-execution-context.js';
import {ReferenceType} from './type.js';
import {Entity} from './entity.js';
import {SerializedEntity, StorageProxy} from './storage-proxy.js';
import {SYMBOL_INTERNALS} from './symbols.js';

enum ReferenceMode {Unstored, Stored}

export class Reference implements Storable {
  public entity: Entity|null = null;
  public type: ReferenceType;

  protected readonly id: string;
  private storageKey: string;
  private readonly context: ParticleExecutionContext;
  private storageProxy: StorageProxy = null;
  protected handle: Collection|null = null;

  [SYMBOL_INTERNALS]: {serialize: () => SerializedEntity};

  constructor(data: {id: string, storageKey: string | null}, type: ReferenceType, context: ParticleExecutionContext) {
    this.id = data.id;
    this.storageKey = data.storageKey;
    this.context = context;
    this.type = type;
    this[SYMBOL_INTERNALS] = {
      serialize: () => ({id: this.id, rawData: this.dataClone()})
    };
  }

  protected async ensureStorageProxy(): Promise<void> {
    if (this.storageProxy == null) {
      this.storageProxy = await this.context.getStorageProxy(this.storageKey, this.type.referredType);
      this.handle = handleFor(this.storageProxy, this.context.idGenerator) as Collection;
      if (this.storageKey) {
        assert(this.storageKey === this.storageProxy.storageKey);
      } else {
        this.storageKey = this.storageProxy.storageKey;
      }
    }
  }

  async dereference(): Promise<Entity|null> {
    assert(this.context, 'Must have context to dereference');

    if (this.entity) {
      return this.entity;
    }

    await this.ensureStorageProxy();

    this.entity = await this.handle.get(this.id);
    return this.entity;
  }

  dataClone(): {storageKey: string, id: string} {
    return {storageKey: this.storageKey, id: this.id};
  }
}

/** A subclass of Reference that clients can create. */
export abstract class ClientReference extends Reference {
  private mode = ReferenceMode.Unstored;
  public stored: Promise<undefined>;

  /** Use the newClientReference factory method instead. */
  protected constructor(entity: Entity, context: ParticleExecutionContext) {
    // TODO(shans): start carrying storageKey information around on Entity objects
    super({id: Entity.id(entity), storageKey: null},
          new ReferenceType(Entity.entityClass(entity).type), context);

    this.entity = entity;
    this.stored = new Promise(async (resolve, reject) => {
      await this.storeReference(entity);
      resolve();
    });
  }

  private async storeReference(entity) {
    await this.ensureStorageProxy();
    await this.handle.store(entity);
    this.mode = ReferenceMode.Stored;
  }

  async dereference(): Promise<Entity|null> {
    if (this.mode === ReferenceMode.Unstored) {
      return null;
    }
    return super.dereference();
  }

  isIdentified(): boolean {
    return Entity.isIdentified(this.entity);
  }

  static newClientReference(context: ParticleExecutionContext): typeof ClientReference {
    return class extends ClientReference {
      constructor(entity: Entity) {
        super(entity, context);
      }
    };
  }
}
