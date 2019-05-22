/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logFactory} from '../../../../build/platform/log-web.js';
import {SyntheticStores} from '../../runtime/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ContextStores} from './context-stores.js';
import {simpleNameOfType, boxes, crackStorageKey} from './context-utils.js';

// Existence and purpose of `user-launcher` are Shell conventions
const getLauncherStore = async storage => {
  return await SyntheticStores.getStore(storage, 'user-launcher');
};

const AbstractListener = class {
  constructor(listener) {
    this.observers = {};
    this.listener = listener;
    this.log = this.createLogger();
  }
  createLogger() {
    return () => false;
  }
  observe(key, store) {
    if (store) {
      this.observers[key] = new StoreObserver(store, this.listener, this);
    }
  }
  async unobserve(key) {
    if (key in this.observers) {
      const observer = this.observers[key];
      // deregister observer immediately
      delete this.observers[key];
      if (observer) {
        // remove descendent data and observers
        await observer.dispose();
      }
    }
  }
};

export const ArcHandleListener = class extends AbstractListener {
  createLogger() {
    return logFactory(`ArcHandleListener`, `#4040FF`);
  }
  async add(handle) {
    this.log('add', handle);
    const store = await SyntheticStores.getHandleStore(handle);
    // TODO(sjmiles): sketchy
    store.handle = handle;
    this.observe(handle.storageKey, store);
  }
  remove(handle) {
    this.unobserve(handle.storageKey);
  }
};

export const ArcMetaListener = class extends AbstractListener {
  async add(entity, store) {
    const {rawData: {key, deleted}} = entity;
    if (!deleted) {
      const {base} = crackStorageKey(store.storageKey);
      this.observe(key, await SyntheticStores.getStore(base, key));
    }
  }
  remove(entity) {
    this.unobserve(entity.rawData.key);
  }
};

export const ShareListener = class extends AbstractListener {
  constructor(context, listener) {
    super(listener);
    this.context = context;
  }
  get isProfile() {
    return false;
  }
  createLogger() {
    return logFactory(`ShareListener`, 'blue');
  }
  async add(entity, store) {
    //this.log('add', entity);
    // TODO(sjmiles): roll this into 'metrics'?
    let backingStorageKey = store.storageKey;
    if (store.backingStore) {
      // TODO(sjmiles): property is not called 'storageKey' for pouchdb
      backingStorageKey = store.backingStore.storageKey;
    }
    // TODO(sjmiles): store/handles are similar but different, we shoved the handle
    // relating to this store onto the store object in ArcHandleListener. Probably
    // this can be unified to use one or t'other.
    const handle = store.handle;
    const metrics = ContextStores.getHandleMetrics(handle, this.isProfile);
    if (metrics) {
      const typeName = simpleNameOfType(store.type);
      const shareType = `${typeName}Share`;
      const shareSchema = this.context.findSchemaByName(shareType);
      if (!shareSchema) {
        this.log(`found a share type [${shareType}] with no schema, ignoring`);
      } else {
        // arc shares
        let share = boxes[metrics.storeId];
        if (!share) {
          this.log(`found new share:`, typeName, metrics.storeName);
          share = boxes[metrics.storeId] = {};
          share.shareStorePromise = ContextStores.getShareStore(this.context, shareSchema, metrics.type, metrics.storeName, metrics.storeId, ['shared']);
        }
        const shareStore = await share.shareStorePromise;
        ContextStores.storeEntityWithUid(shareStore, entity, backingStorageKey, metrics.userid);
        // collation boxes
        let box = boxes[metrics.boxStoreId];
        if (!box) {
          box = boxes[metrics.boxStoreId] = {};
          box.boxStorePromise = ContextStores.getShareStore(this.context, shareSchema, metrics.type, metrics.boxStoreId, metrics.boxStoreId, ['shared']);
        }
        const boxStore = await box.boxStorePromise;
        ContextStores.storeEntityWithUid(boxStore, entity, backingStorageKey, metrics.userid);
      }
    }
  }
  async remove(entity, store) {
    const _remove = async (box, promiseName) => {
      if (box && box[promiseName]) {
        const store = await box[promiseName];
        ContextStores.removeEntityWithUid(store, entity/*, metrics.userid*/);
      }
    };
    //this.log('removing entity', entity);
    const metrics = ContextStores.getHandleMetrics(store.handle, this.isProfile);
    if (metrics) {
      _remove(boxes[metrics.storeId], 'shareStorePromise');
      _remove(boxes[metrics.boxStoreId], 'boxStorePromise');
    }
  }
};

export const ProfileListener = class extends ShareListener {
  get isProfile() {
    return true;
  }
  createLogger() {
    return logFactory(`ProfileListener`, 'green');
  }
  isFriendStore(store) {
    return (simpleNameOfType(store.type) === 'Friend' && store.type.isCollection);
  }
  async add(entity, store) {
    this.log('add', entity);
    await super.add(entity, store);
    if (this.isFriendStore(store)) {
      const launcher = await getLauncherStore(entity.rawData.publicKey);
      this.observe(entity.id, launcher);
    }
  }
  async remove(entity, store) {
    await super.remove(entity, store);
    if (this.isFriendStore(store)) {
      this.unobserve(entity.id);
    }
  }
};
