/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Reference} from '../../build/runtime/reference.js';
import {EntityType} from '../../build/runtime/type.js';
import {crackStorageKey, simpleNameOfType} from './context-utils.js';
import {Stores} from './stores.js';

const pendingStores = {};

const ContextStoresImpl = class {
  getStoreMetrics(store, isProfile) {
    // TODO(sjmiles): store/handles are similar but different. We shoved the handle
    // relating to this store onto the store object in ArcHandleListener. Probably
    // this can be unified to use one or t'other.
    const metrics = ContextStores.getHandleMetrics(store.handle, isProfile);
    // TODO(sjmiles): roll this into 'metrics'? but thse are `store` not `handle` :(
    metrics.backingStorageKey = store.storageKey;
    if (store.backingStore) {
      // TODO(sjmiles): property is not called 'storageKey' for pouchdb
      metrics.backingStorageKey = store.backingStore.storageKey;
    }
    metrics.typeName = simpleNameOfType(store.type);
    metrics.shareTypeName = `${metrics.typeName}Share`;
    return metrics;
  }
  getHandleMetrics(handle, isProfile) {
    const tag = (handle.tags && handle.tags.length) ? handle.tags.join('-') : null;
    const {base: userid, arcid, id} = crackStorageKey(handle.storageKey);
    const type = handle.type.isCollection ? handle.type : handle.type.collectionOf();
    const shareId = `${tag}|${id}|from|${userid}|${arcid}`;
    const shortId = `${(isProfile ? `PROFILE` : `FRIEND`)}_${tag}`;
    const storeName = shortId;
    const storeId = isProfile ? shortId : shareId;
    const boxStoreId = `BOXED_${tag}`;
    const boxDataId = `${userid}|${arcid}`;
    const metrics = {userid, type, tag, tags: [tag], storeId, storeName, boxStoreId, boxDataId};
    return metrics;
  }
  async getShareStore(context, schema, name, id, tags) {
    // cache and return promises in case of re-entrancy
    let promise = pendingStores[id];
    if (!promise) {
      promise = (async () => {
        let store = await context.findStoreById(id);
        if (!store) {
          store = await this.createReferenceStore(context, schema, name, id, tags);
        }
        return store;
      })();
      pendingStores[id] = promise;
    }
    return promise;
  }
  async storeEntityWithUid(store, entity, backingStorageKey, uid) {
    this.storeEntityReference(store, entity, backingStorageKey, uid);
  }
  removeEntityWithUid(store, entity) {
    store.remove(`shared-${entity.id}`);
  }
  async createReferenceStore(context, schema, name, id, tags) {
    const type = (new EntityType(schema)).collectionOf();
    const store = await Stores.createStore(context, type, {name, id: `${id}`, tags});
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

