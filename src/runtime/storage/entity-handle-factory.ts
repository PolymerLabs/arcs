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
import {CRDTMuxEntity} from './storage.js';

export class EntityHandleFactory<T extends CRDTMuxEntity> {

  constructor(readonly storageProxyMuxer: StorageProxyMuxer<T>, readonly name?: string, ) {}

  getHandle(muxId: string): EntityHandle<Entity> {
    const storageProxy = this.storageProxyMuxer.getStorageProxy(muxId);
    const frontend = storageProxy.getStorageFrontend();
    return new EntityHandle<Entity>(
      frontend.generateID(),
      storageProxy,
      frontend.idGenerator,
      null,
      true,
      true,
      muxId);
    }
  }
