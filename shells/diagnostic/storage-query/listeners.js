import {logFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {simpleNameOfType, getBoxTypeSpec, boxes} from './utils.js';

// Shell convention
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
    const observer = this.observers[key];
    // deregister observer immediately
    delete this.observers[key];
    if (observer) {
      // remove descendent data and observers
      await observer.dispose();
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
      // TODO(sjmiles): cheating?
      const storage = store.storageKey.split('/').slice(0, -3).join('/');
      this.observe(key, await SyntheticStores.getStore(storage, key));
    }
  }
  remove(entity) {
    const {rawData: {key, deleted}} = entity;
    if (!deleted) {
      this.unobserve(key);
    }
  }
};

export const ShareListener = class extends AbstractListener {
  constructor(context, listener) {
    super(listener);
    this.context = context;
    this.pendingStores = {};
  }
  createLogger() {
    return logFactory(`ShareListener`, 'blue');
  }
  async add(entity, store) {
    const handle = store.handle;
    const metrics = this.getStoreMetrics(handle, store, false);
    if (metrics) {
      const typeName = simpleNameOfType(store.type);
      const typeSpec = getBoxTypeSpec(store);
      let box = boxes[typeSpec];
      if (!box) {
        this.log(`found new share type:`, typeName);
        box = boxes[typeSpec] = {};
        box.shareStore =
          await this.getShareStore(this.context, metrics.type, metrics.storeName, metrics.storeId, metrics.tags);
        console.log(box.shareStore);
      }
    }
  }
  remove(entity, store) {
    const typeSpec = getBoxTypeSpec(store);
    const box = boxes[typeSpec];
    if (box) {
      // do something
    }
  }
  getStoreMetrics(handle, store, isProfile) {
    const tags = handle.tags ? handle.tags.join('-') : '';
    //if (tags) {
      // TODO(sjmiles): cheating?
      const storageParts = store.storageKey.split('/');
      const userid = storageParts.slice(0, -3).join('/');
      const arcid = storageParts.slice(-3, -2);
      //
      const type = handle.type.isCollection ? handle.type : handle.type.collectionOf();
      const id = SyntheticStores.snarfId(handle.storageKey);
      //
      const shareid = `${tags}|${id}|from|${userid}|${arcid}`;
      const shortid = `${(isProfile ? `PROFILE` : `FRIEND`)}_${tags}`;
      const storeName = shortid;
      const storeId = isProfile ? shortid : shareid;
      const boxStoreId = `BOXED_${tags}`;
      const boxDataId = `${userid}|${arcid}`;
      //
      const metrics = {type, tags, storeId, storeName, boxStoreId, boxDataId};
      //console.log('Share metrics', storeId); //metrics);
      return metrics;
    //}
  }
  async getShareStore(context, type, name, id, tags) {
    // TODO(sjmiles): cache and return promises in case of re-entrancy
    let promise = this.pendingStores[id];
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
      this.pendingStores[id] = promise;
    }
    return promise;
  }
};

export const ProfileListener = class extends ShareListener {
  createLogger() {
    return logFactory(`ProfileListener`, 'green');
  }
  isFriendStore(store) {
    return (simpleNameOfType(store.type) === 'Friend' && store.type.isCollection);
  }
  async add(entity, store) {
    super.add(entity, store);
    if (this.isFriendStore(store)) {
      const launcher = await getLauncherStore(entity.rawData.publicKey);
      this.observe(entity.id, launcher);
    }
  }
  remove(entity, store) {
    super.remove(entity, store);
    if (this.isFriendStore(store)) {
      this.unobserve(entity.id);
    }
  }
};
