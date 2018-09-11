/** @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

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
  private handle = null;
  constructor(data : {id: string, storageKey: string}, type, context) {
    this.id = data.id;
    this.storageKey = data.storageKey;
    this.context = context;
    this.type = type;
  }

  async dereference() {
    if (this.entity) {
      return this.entity;
    }

    if (this.storageProxy == null) {
      this.storageProxy = await this.context.getStorageProxy(this.storageKey, this.type.referenceReferredType);
      this.handle = handleFor(this.storageProxy);
      this.handle.entityClass = this.type.referenceReferredType.entitySchema.entityClass();
    }

    this.entity = await this.handle.get(this.id);
    return this.entity;
  }
}

