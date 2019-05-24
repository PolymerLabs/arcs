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

// Existence and purpose of `user-launcher` is a Shell convention
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
  async add(handle) {
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
    const handle = store.handle;
    const metrics = ContextStores.getHandleMetrics(handle, this.isProfile);
    if (metrics) {
      const {base: userid} = crackStorageKey(store.storageKey);
      const typeName = simpleNameOfType(store.type);
      //
      let share = boxes[metrics.storeId];
      if (!share) {
        this.log(`found new share:`, typeName, metrics.storeName);
        // TODO(sjmiles): critical re-entry situation, anybody trying to access the box
        // during the `await` on the next line will see no store.
        // We attempt to avoid this by await'ing `add` when looping over change records.
        share = boxes[metrics.storeId] = {};
        share.shareStorePromise = ContextStores.getShareStore(this.context, metrics.type, metrics.storeName, metrics.storeId, ['shared']);
      }
      const shareStore = await share.shareStorePromise;
      ContextStores.storeEntityWithUid(shareStore, entity, userid);
      //
      let box = boxes[metrics.boxStoreId];
      if (!box) {
        box = boxes[metrics.boxStoreId] = {};
        box.boxStorePromise = ContextStores.getShareStore(this.context, metrics.type, metrics.boxStoreId, metrics.boxStoreId, ['shared']);
      }
      const boxStore = await box.boxStorePromise;
      ContextStores.storeEntityWithUid(boxStore, entity, userid);
    }
  }
  async remove(entity, store) {
    this.log('removing entity', entity);
    const {base: userid} = crackStorageKey(store.storageKey);
    const metrics = ContextStores.getHandleMetrics(store.handle, this.isProfile);
    if (metrics) {
      const share = boxes[metrics.storeId];
      if (share && share.shareStorePromise) {
        const shareStore = await share.shareStorePromise;
        ContextStores.removeEntityWithUid(shareStore, entity, userid);
      }
      const box = boxes[metrics.boxStoreId];
      if (box && box.boxStorePromise) {
        const boxStore = await box.boxStorePromise;
        ContextStores.removeEntityWithUid(boxStore, entity, userid);
      }
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
