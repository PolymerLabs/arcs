/** @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js'; 
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {Type} from './type.js';
import {handleFor} from '../handle.js';

export class Reference {
  public entity = null;
  public type: Type;

  private id: string;
  private storageKey: string;
  private context: ParticleExecutionContext;
  private storageProxy = null;
  protected handle = null;
  constructor(data : {id: string, storageKey: string | null}, type, context) {
    this.id = data.id;
    this.storageKey = data.storageKey;
    this.context = context;
    this.type = type;
  }

  protected async ensureStorageProxy() {
    if (this.storageProxy == null) {
      this.storageProxy = await this.context.getStorageProxy(this.storageKey, this.type.referenceReferredType);
      this.handle = handleFor(this.storageProxy);
      this.handle.entityClass = this.type.referenceReferredType.entitySchema.entityClass();
      if (this.storageKey) {
        assert(this.storageKey === this.storageProxy.storageKey);
      } else {
        this.storageKey = this.storageProxy.storageKey;
      }
    }
  }

  async dereference() {
    if (this.entity) {
      return this.entity;
    }

    await this.ensureStorageProxy();

    this.entity = await this.handle.get(this.id);
    return this.entity;
  }

  dataClone() {
    return {storageKey: this.storageKey, id: this.id};
  }
}

enum ReferenceMode {Unstored, Stored}

export function newClientReference(context) {
  return class extends Reference {
    private mode = ReferenceMode.Unstored;
    public stored: Promise<undefined>;
    constructor(entity) {
      super({id: entity.id, storageKey: null}, Type.newReference(entity.constructor.type), context);
    
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

    async dereference() {
      if (this.mode === ReferenceMode.Unstored) {
        return null;
      }
      return super.dereference();
    }

    isIdentified() {
      return this.entity.isIdentified();
    }
  };
}

