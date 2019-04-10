import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
import {logFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {ObserverTable} from './observer-table.js';

const userTable = new ObserverTable('user');
const metaTable = new ObserverTable('meta');
const entitiesTable = new ObserverTable('entities');
const friendsTable = new ObserverTable('friends');

// UserObserver (user)
// 0: key
//   ArcObserver (key/user-launcher)
//     0: Arcid store
//        0: ArcObserver
//          0: user store
//          n: user store
//        n: ArccObserver
//        ...
// 1: key
//   ArcObserver (key/user-launcher)
// ...

// thing observer
//   0: sub-thing
//     0: sub-sub-thing

// for user Foo
//   shared handle: add/remove/change

const nob = () => Object.create(null);

class AbstractEventer {
  constructor(listener, owner) {
    this.listener = listener;
    this.owner = owner;
  }
  dispose() {
    //if (this.listener) {
    //  this.listener.dispose();
    //}
  }
  fire(name, data) {
    if (this.listener && this.listener[name]) {
      return this.listener[name](data, this.owner);
    }
  }
}

class StoreObserver extends AbstractEventer {
  constructor(store, listener, owner) {
    super(listener, owner);
    const key = store.storageKey.split('/')[3];
    this.log = logFactory(`StoreObserver[${key}::${store.id}]`, 'orange');
    this.group = logFactory(`StoreObserver[${key}::${store.id}]`, 'orange', 'group');
    this.records = nob();
    this.store = store;
    this.connect(store);
  }
  async connect(store) {
    if (store.toList) {
      await this.notifyInitialPopulation(store);
      const onchange = change => this.onChange(change);
      store.on('change', onchange, this);
      this.off = () => store.off(onchange);
    }
    else {
      this.log('store has no toList', store);
    }
  }
  dump() {
    this.group();
    this.listener.dump();
    //Object.keys(this.records).forEach(key => console.log(key, this.records[key]));
    console.groupEnd();
  }
  dispose() {
    if (this.off) {
      this.group(`dispose:`, Object.keys(this.records));
      this.off();
      this.off = null;
      this.disposePopulation();
      super.dispose();
      console.groupEnd();
    }
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
  getRecordId(record) {
    // TODO(sjmiles): SyntheticStorage produces non-Entity objects for Handles
    return record.id || record.storageKey;
  }
  add(record) {
    this.records[this.getRecordId(record)] = record;
    this.fire('add', record);
  }
  remove(record) {
    delete this.records[this.getRecordId(record)];
    this.fire('remove', record);
  }
  async notifyInitialPopulation(store) {
    // process initial data
    this.log('initial population');
    // TODO(sjmiles): assumes Collection
    const data = await store.toList();
    data.forEach(entity => this.add(entity));
  }
  async disposePopulation() {
    Object.values(this.records).forEach(entity => this.remove(entity));
    this.records = null;
  }
}

const AbstractListener = class {
  constructor(listener) {
    this.listener = listener;
    this.observers = nob();
    this.group = logFactory(`AbstractListener`, 'purple');
  }
  dispose() {
    if (this.disposed) {
      console.error('listener already disposed');
    }
    else if (!this.observers) {
      console.error('listener has no observers');
    }
    else {
      Object.values(this.observers).forEach(observer => observer.dispose());
      this.observers = null;
      this.disposed = true;
      console.groupEnd();
    }
  }
  unobserve(store) {
    this.observers[store.id].dispose();
    delete this.observers[store.id];
  }
  observe(store, owner) {
    this.observers[store.id] = new StoreObserver(store, this.listener, owner);
  }
  dump() {
    Object.values(this.observers).forEach(observer => observer.dump());
  }
};

const HandlesListener = class extends AbstractListener {
  constructor(listener) {
    super(listener);
    this.log = logFactory(`HandlesListener`, 'green');
    this.warn = logFactory(`HandlesListener`, 'green');
    this.stores = nob();
  }
  async add(handle, owner) {
    //console.log(handle);
    this.displayHandle(handle);
    const store = await SyntheticStores.getHandleStore(handle);
    if (this.stores[handle.storageKey]) {
      this.warn(`already listening to [${handle.storageKey}]`);
    } else {
      this.stores[handle.storageKey] = store;
      this.observe(store, {store, owner, handle});
    }
  }
  async remove({storageKey}) {
    this.log(`removing [${storageKey}]`);
    this.unobserve(this.stores[storageKey]);
    delete this.stores[storageKey];
    this.eraseHandle({storageKey});
  }
  displayHandle(handle) {
    let name = handle.type.getEntitySchema().names[0];
    if (handle.type.isCollection) {
      name = `[${name}]`;
    }
    const key = handle.storageKey.split('/').pop();
    userTable.addRow(handle.storageKey, [name, key]);
  }
  eraseHandle({storageKey}) {
    userTable.removeRow(storageKey);
  }
};

const ArcMetaListener = class extends AbstractListener {
  constructor(listener) {
    super(listener);
    this.log = logFactory(`ArcMetaListener`, 'blue');
  }
  async add(data, {owner}) {
    const {key, description, deleted} = data.rawData;
    if (!deleted) {
      metaTable.addRow(data.id, [key, description]);
      const storage = owner.rawData && owner.rawData.publicKey || owner;
      this.log('storage =', storage);
      const store = await SyntheticStores.getStore(storage, key);
      if (store) {
        // get list of handles in user-launcher
        this.observe(store, {store, owner, data});
      } else {
        this.log('failed to marshal store');
      }
    }
  }
  remove(data) {
    const {key, description, deleted} = data.rawData;
    if (!deleted) {
      this.log(`removing [${data.id}]`);
      metaTable.removeRow(data.id, [key, description]);
    }
  }
};

const ProfileListener = class extends AbstractListener {
  constructor(listener) {
    super(listener);
    this.log = logFactory(`ProfileListener`, 'yellow');
    this.stores = nob();
  }
  async add(data, {owner, handle}) {
    //const key = handle.type.toString();
    const typeName = handle.type.getEntitySchema().names[0];
    //entitiesTable.onAdd({key, description: JSON.stringify(data.rawData)});
    const user = owner.owner.split('/').pop();
    entitiesTable.addRow(data.id, [user, JSON.stringify(data.rawData)]);
    if (typeName === 'Friend') {
      const {publicKey} = data.rawData;
      friendsTable.addRow(data.id, [publicKey]);
      const store = await SyntheticStores.getStore(publicKey, 'user-launcher');
      this.observe(store, data);
    }
  }
  async remove(data) {
    entitiesTable.removeRow(data.id);
    friendsTable.removeRow(data.id);
  }
};

const BoxListener = class extends AbstractListener {
  constructor(listener) {
    super(listener);
    this.log = logFactory(`BoxListener`, 'indigo');
  }
  async add(data, {owner, handle}) {
    const user = owner.owner.rawData.publicKey.split('/').pop();
    //const typeName = handle.type.toString();
    //const typeName = handle.type.getEntitySchema().names[0];
    entitiesTable.addRow(data.id, [user /*typeName*/, JSON.stringify(data.rawData)]);
  }
  remove(data) {
    entitiesTable.removeRow(data.id);
  }
};

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`;

(async () => {
  //const shareOb = new ArcObserver(key, 'user-launcher', userTable);
  //
  const store = await SyntheticStores.getStore(storage, 'user-launcher');
  if (store) {
    // const chain = {
    //   top: ArcMetaListener,
    //   profile: ProfileListener,
    //   selfShares: ArcMetaListener,
    //   box: BoxListener
    // };
    // let listener = null;
    // for (let keys=Object.keys(chain), key=null, i=0; (key=keys[i]); i++) {
    //   listener = new HandlesListener(new (chain.pop())(listener, name));
    // }
    //const chain = [ArcMetaListener, ProfileListener, ArcMetaListener, BoxListener];
    const chain = [ArcMetaListener, ProfileListener, ArcMetaListener];
    let listener = null;
    while (chain.length) {
     listener = new HandlesListener(new (chain.pop())(listener));
    }
    // get list of handles in user-launcher
    const observer = new StoreObserver(store, listener, storage);
    window.ob = observer;
    //new HandlesListener(new ArcMetaListener(new HandlesListener(new ProfileListener(new HandlesListener(new ArcMetaListener()))))));
    window.dispose = () => {
      observer.dispose();
    };
  }
})();

