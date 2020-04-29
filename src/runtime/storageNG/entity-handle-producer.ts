/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {EntityHandle} from './handle.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {Entity} from '../entity.js';
import {Identified, CRDTEntityTypeRecord} from '../crdt/crdt-entity.js';

export class EntityHandleProducer<T extends CRDTEntityTypeRecord<Identified, Identified>> {
  storageProxyMuxer: StorageProxyMuxer<T>;

  constructor(storageProxyMuxer: StorageProxyMuxer<T>) {
    this.storageProxyMuxer = storageProxyMuxer;
  }

  getHandle(muxId: string): EntityHandle<Entity> {
    const storageProxy = this.storageProxyMuxer.getStorageProxy(muxId);
    const context = storageProxy.getChannelConstructor();
    return new EntityHandle<Entity>(
      context.generateID(),
      storageProxy,
      context.idGenerator,
      null,
      true,
      true,
      muxId);
    }
  }
