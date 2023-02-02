/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Const} from '../configuration/constants.js';
import {logsFactory} from '../../build/platform/logs-factory.js';
import {SyntheticStores} from './synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {ContextStores} from './context-stores.js';
import {simpleNameOfType, boxes, crackStorageKey} from './context-utils.js';

// Existence and purpose of launcher arc are Shell conventions
const getLauncherStore = async storage => SyntheticStores.getStore(storage, Const.DEFAULT.launcherId);

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
    return logsFactory(`ArcHandleListener`, `#4040FF`).log;
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

const ContextAwareListener = class extends AbstractListener {
  constructor(context, listener) {
    super(listener);
    this.context = context;
  }
  async addSharedEntity({entity, shareSchema}, {userid, storeId, storeName, backingStorageKey, typeName}) {
    let share = boxes[storeId];
    if (!share) {
      this.log(`found new share:`, typeName, storeName);
      share = boxes[storeId] = {};
      share.shareStorePromise = ContextStores.getShareStore(this.context, shareSchema, storeName, storeId, ['shared']);
    }
    const shareStore = await share.shareStorePromise;
    ContextStores.storeEntityWithUid(shareStore, entity, backingStorageKey, userid);
  }
  async addBoxedEntity({entity, shareSchema}, {userid, boxStoreId, backingStorageKey}) {
    let box = boxes[boxStoreId];
    if (!box) {
      box = boxes[boxStoreId] = {};
      box.boxStorePromise = ContextStores.getShareStore(this.context, shareSchema, boxStoreId, boxStoreId, ['shared']);
    }
    const boxStore = await box.boxStorePromise;
    ContextStores.storeEntityWithUid(boxStore, entity, backingStorageKey, userid);
  }
  async remove(entity, store) {
    this.unobserve(entity.rawData.key);
    const _remove = async (box, promiseName) => {
      if (box && box[promiseName]) {
        const store = await box[promiseName];
        ContextStores.removeEntityWithUid(store, entity/*, metrics.userid*/);
      }
    };
    //this.log('removing entity', entity);
    const metrics = ContextStores.getHandleMetrics(store.handle, this.isProfile);
    if (metrics.tag) {
      _remove(boxes[metrics.storeId], 'shareStorePromise');
      _remove(boxes[metrics.boxStoreId], 'boxStorePromise');
    }
  }
};

export const ArcMetaListener = class extends ContextAwareListener {
  async add(entity, store) {
    const {rawData: {key, deleted}} = entity;
    if (!deleted) {
      const {base} = crackStorageKey(store.storageKey);
      this.observe(key, await SyntheticStores.getStore(base, key));
    }
  }
};

export const FriendArcMetaListener = class extends ArcMetaListener {
  createLogger() {
    return logsFactory(`FriendArcMetaListener`, `#5321a5`).log;
  }
  async add(entity, store) {
    const {rawData: {key, deleted}} = entity;
    if (!deleted) {
      const {base} = crackStorageKey(store.storageKey);
      this.observe(key, await SyntheticStores.getStore(base, key));
      //
      const metrics = ContextStores.getStoreMetrics(store);
      this.log(`add shared arc [${base}]`/*, store*/);
      const shareSchema = this.context.findSchemaByName(metrics.shareTypeName);
      if (!shareSchema) {
        this.log(`found a share type [${metrics.shareTypeName}] with no schema, ignoring`);
      } else {
        // TODO(sjmiles): historically, no `tag` on ArcMeta store, so we have
        // to simulate that info
        metrics.boxStoreId = metrics.boxStoreId.replace(/null/g, 'arc');
        // metrics needed: {userid, boxStoreId, backingStorageKey}
        this.addBoxedEntity({entity, shareSchema}, metrics);
      }
    }
  }
};

export const ShareListener = class extends ContextAwareListener {
  get isProfile() {
    return false;
  }
  createLogger() {
    return logsFactory(`ShareListener`, 'blue').log;
  }
  async add(entity, store) {
    // TODO(sjmiles): `store.handle` is expected by getStoreMetrics, this is part
    // of the handle/store confusion I didn't resolve properly here
    const metrics = ContextStores.getStoreMetrics(store, this.isProfile);
    if (metrics.tag) {
      const shareSchema = this.context.findSchemaByName(metrics.shareTypeName);
      if (!shareSchema) {
        this.log(`found a share type [${metrics.shareTypeName}] with no schema, ignoring`);
      } else {
        // individual shares
        this.addSharedEntity({entity, shareSchema}, metrics);
        // collated (boxed) shares
        this.addBoxedEntity({entity, shareSchema}, metrics);
      }
    }
  }
};

export const ProfileListener = class extends ShareListener {
  get isProfile() {
    return true;
  }
  createLogger() {
    return logsFactory(`ProfileListener`, 'green').log;
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
