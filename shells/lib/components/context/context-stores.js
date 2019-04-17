/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {crackStorageKey} from './context-utils.js';
import {Reference} from '../../../../build/runtime/reference.js';

const pendingStores = {};

const ContextStoresImpl = class {
  getHandleMetrics(handle, isProfile) {
    const tag = (handle.tags && handle.tags.length) ? handle.tags.join('-') : null;
    if (tag) {
      const {base: userid, arcid, id} = crackStorageKey(handle.storageKey);
      const type = handle.type.isCollection ? handle.type : handle.type.collectionOf();
      const shareId = `${tag}|${id}|from|${userid}|${arcid}`;
      const shortId = `${(isProfile ? `PROFILE` : `FRIEND`)}_${tag}`;
      const storeName = shortId;
      const storeId = isProfile ? shortId : shareId;
      const boxStoreId = `BOXED_${tag}`;
      const boxDataId = `${userid}|${arcid}`;
      const metrics = {type, tags: [tag], storeId, storeName, boxStoreId, boxDataId};
      return metrics;
    }
  }
  async getShareStore(context, type, name, id, tags) {
    // cache and return promises in case of re-entrancy
    let promise = pendingStores[id];
    if (!promise) {
      promise = new Promise(async (resolve) => {
        const store = await context.findStoreById(id);
        if (store) {
          resolve(store);
        } else {
          const store = await context.createStore(type, name, id, tags);
          resolve(store);
        }
      });
      pendingStores[id] = promise;
    }
    return promise;
  }
  getDecoratedId(entity, uid) {
    return `${entity.id}:uid:${uid}`;
  }
  async storeEntityWithUid(store, entity, uid) {
    const id = this.getDecoratedId(entity, uid);
    const decoratedEntity = {id, rawData: entity.rawData};
    // context stores are always Collection
    store.store(decoratedEntity, [store.generateID()]);
  }
  removeEntityWithUid(store, entity, uid) {
    const id = this.getDecoratedId(entity, uid);
    store.remove(id);
  }
};

export const ContextStores = new ContextStoresImpl();
