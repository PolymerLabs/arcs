import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
import {logFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {ObserverTable} from './observer-table.js';

const userTable = new ObserverTable('user');
const metaTable = new ObserverTable('meta');
const entitiesTable = new ObserverTable('entities');
const friendsTable = new ObserverTable('friends');

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`;

const typeOf = handle => {
  let typeName = handle.type.getEntitySchema().names[0];
  if (handle.type.isCollection) {
    typeName = `[${typeName}]`;
  }
  return typeName;
};

let observers = 0;

class StoreObserver {
  constructor(store, listener, owner) {
    this.store = store;
    this.listener = listener;
    this.owner = owner;
    this.log = logFactory('StoreObserver', 'orange');
    this._connect(store);
    observers++;
  }
  async _connect(store) {
    const data = store.toList ? await store.toList() : [await store.get()];
    data.forEach(value => value && this.add(value));
    //
    const onchange = change => this.onChange(change);
    store.on('change', onchange, this);
    this.off = () => store.off(onchange);
  }
  async dispose() {
    if (--observers === 0) {
      console.warn(`all observers disposed (probably a good thing)`);
    }
    this.off();
    //
    const {store} = this;
    const data = store.toList ? await store.toList() : [await store.get()];
    data.forEach(value => value && this.remove(value));
    //
    this.listener.dispose();
  }
  onChange({add, remove}) {
    this.log('onChange', add, remove);
    //console.log({add, remove});
    if (add) {
      add.forEach(({value}) => this.add(value));
    }
    if (remove) {
      remove.forEach(({value}) => this.remove(value));
    }
  }
  add(value) {
    this.listener.add(value, this);
  }
  remove(value) {
    this.listener.remove(value, this);
  }
}

const AbstractListener = class {
  constructor(listener) {
    this.observers = {};
    this.listener = listener;
  }
  get name() {
    return `AbstractListener`;
  }
  observe(key, store) {
    this.observers[key] = new StoreObserver(store, this.listener, this);
  }
  async unobserve(key) {
    const observer = this.observers[key];
    delete this.observers[key];
    if (observer) {
      await observer.dispose();
    }
  }
  dispose() {
  }
};

const NoopListener = class extends AbstractListener {
  add() {
    //
  }
  remove() {
    //
  }
};

const HandleListener = class extends AbstractListener {
  async add(handle) {
    const key = handle.storageKey;
    userTable.addRow(key, [typeOf(handle), key]);
    //
    const store = await SyntheticStores.getHandleStore(handle);
    this.observe(key, store);
  }
  remove(handle) {
    const key = handle.storageKey;
    userTable.removeRow(key);
    //
    this.unobserve(key);
  }
};

const MetaListener = class extends AbstractListener {
  async add(entity, owner) {
    const {id, rawData: {description, key, deleted}} = entity;
    if (!deleted) {
      entitiesTable.addRow(id, [id, description]);
      //metaTable.addRow(id, [id, description]);
      //
      const storage = owner.store.storageKey.split('/').slice(0, -3).join('/');
      const store = await SyntheticStores.getStore(storage, key);
      if (store) {
        this.observe(key, store);
      }
    }
  }
  remove(entity) {
    const {id, rawData: {key, deleted}} = entity;
    if (!deleted) {
      //metaTable.removeRow(id);
      entitiesTable.removeRow(id);
      //
      this.unobserve(key);
    }
  }
};

const ProfileListener = class extends AbstractListener {
  get name() {
    return `ProfileListener`;
  }
  async add(entity) {
    const {id, rawData} = entity;
    entitiesTable.addRow(id, [id, JSON.stringify(rawData)]);
    //
    if (rawData.publicKey) {
      friendsTable.addRow(id, [rawData.publicKey]);
      const store = await SyntheticStores.getStore(rawData.publicKey, 'user-launcher');
      this.observe(id, store);
    }
  }
  remove(entity) {
    const {id, rawData} = entity;
    entitiesTable.removeRow(id);
    //
    if (rawData.publicKey) {
      friendsTable.removeRow(id);
      this.unobserve(id);
    }
  }
};

const thingListener = {
  observers: {},
  async add(entity) {
    const {id: key, rawData} = entity;
    entitiesTable.addRow(key, [key, JSON.stringify(rawData)]);
  },
  remove(entity) {
    const key = entity.id;
    entitiesTable.removeRow(key);
  },
  dispose() {
  }
};

const observe = async () => {
  const store = await SyntheticStores.getStore(storage, 'user-launcher');
  if (store) {
    window.ob = new StoreObserver(store,
      new HandleListener(
        new MetaListener(
          new HandleListener(
            new ProfileListener(
              new HandleListener(
                new MetaListener(
                  new HandleListener(
                    //new NoopListener()
                    thingListener
                  )
                )
              )
            )
          )
        )
      )
    );
    window.dispose = () => window.ob.dispose();
  }
};
window.observe = observe;
observe();
