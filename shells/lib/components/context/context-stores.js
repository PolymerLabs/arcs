/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {crackStorageKey, simpleNameOfType} from './context-utils.js';
import {Reference} from '../../../../build/runtime/reference.js';
import {Type} from '../../../../build/runtime/type.js';
import {logFactory} from '../../../../build/platform/log-web.js';

const log = logFactory('ContextStores', 'lime');

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
  async getShareStore(context, schema, name, id, tags) {
    // cache and return promises in case of re-entrancy
    let promise = pendingStores[id];
    if (!promise) {
      promise = new Promise(async resolve => {
        const store = await context.findStoreById(id);
        if (store) {
          resolve(store);
        } else {
          const store = await this.createReferenceStore(context, schema, name, id, tags);
          resolve(store);
        }
      });
      pendingStores[id] = promise;
    }
    return promise;
  }
  // getDecoratedId(entity, uid) {
  //   return `${entity.id}:uid:${uid}`;
  // }
  async storeEntityWithUid(store, entity, backingStorageKey, uid) {
    this.storeEntityReference(store, entity, backingStorageKey, uid);
  }
  removeEntityWithUid(store, entity) {
    store.remove(`shared-${entity.id}`);
  }
  async createReferenceStore(context, schema, name, id, tags) {
    const shareType = schema.type.collectionOf();
    const store = await context.createStore(shareType, name, `${id}`, tags);
    return store;
  }
  async storeEntityReference(store, entity, backingStorageKey, uid) {
    // TODO(sjmiles): runtime-team tells me storageKey will be baked into entity in future
    entity.storageKey = backingStorageKey;
    const ref = await createReferenceFor(entity);
    const refEntity = {
      id: `shared-${entity.id}`,
      rawData: {
        ref: ref,
        fromKey: uid
      }
    };
    store.store(refEntity, [String(Math.random())]);
  }
};

const createReferenceFor = async entity => {
  const ref = new Reference(entity);
  await ref.stored;
  return ref;
};

export const ContextStores = new ContextStoresImpl();

