import {logFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {StoreObserver} from './store-observer.js';
import {simpleNameOfType, getBoxTypeSpec, boxes} from './utils.js';

// Shell convention
const getLauncherStore = async storage => {
  return await SyntheticStores.getStore(storage, 'user-launcher');
};

const NoopListener = class {
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

export const ArcHandleListener = class extends NoopListener {
  async add(handle) {
    const store = await SyntheticStores.getHandleStore(handle);
    this.observe(handle.storageKey, store);
  }
  remove(handle) {
    this.unobserve(handle.storageKey);
  }
};

export const ArcMetaListener = class extends NoopListener {
  async add(entity, store) {
    const {rawData: {key, deleted}} = entity;
    if (!deleted) {
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

export const ShareListener = class extends NoopListener {
  constructor(context, listener) {
    super(listener);
    this.context = context;
  }
  createLogger() {
    return logFactory(`ShareListener`, 'blue');
  }
  async add(entity, store) {
    const typeName = simpleNameOfType(store.type);
    const typeSpec = getBoxTypeSpec(store);
    let box = boxes[typeSpec];
    if (!box) {
      this.log(`found new share type:`, typeName);
      box = boxes[typeSpec] = {};
    }
  }
  remove(entity, store) {
    const typeSpec = getBoxTypeSpec(store);
    const box = boxes[typeSpec];
    if (box) {
      // do something
    }
  }
};

export const ProfileListener = class extends ShareListener {
  createLogger() {
    return logFactory(`ProfileListener`, 'green');
  }
  async add(entity, store) {
    super.add(entity, store);
    if (simpleNameOfType(store.type) === 'Friend' && store.type.isCollection) {
      const store = await getLauncherStore(entity.rawData.publicKey);
      this.observe(entity.id, store);
    }
  }
  remove(entity, store) {
    super.remove(entity, store);
    if (simpleNameOfType(store.type) === 'Friend' && store.type.isCollection) {
      this.unobserve(entity.id);
    }
  }
};
