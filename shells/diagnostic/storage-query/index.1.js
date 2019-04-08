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

class AbstractEventer {
  constructor(listener) {
    this.listener = listener;
  }
  fire(name, data) {
    if (this.listener && this.listener[name]) {
      return this.listener[name](data);
    }
  }
  dispose() {
  }
}

class StoreObserver extends AbstractEventer {
  constructor(store, listener) {
    super(listener);
    const key = store.storageKey.split('/')[3];
    this.log = logFactory(`StoreObserver[${key}::${store.id}]`, 'green');
    this.store = store;
    this.connect(store);
  }
  async connect(store) {
    if (store.toList) {
      await this.notifyInitialPopulation(store);
      const onchange = change => this.onChange(change);
      this.dispose = () => store.off(onchange);
      store.on('change', onchange, this);
    }
  }
  onChange({add, remove}) {
    this.log('onChange', add, remove);
    //console.log({add, remove});
    if (add) {
      add.forEach(({value}) => this.onAdd(value));
    }
    if (remove) {
      remove.forEach(({value}) => this.onRemove(value));
    }
  }
  async notifyInitialPopulation(store) {
    // process initial data
    this.log('initial population');
    // TODO(sjmiles): assumes Collection
    const data = await store.toList();
    data.forEach(value => this.onAdd(value));
  }
  onAdd(data) {
    this.fire('add', data);
  }
  onRemove(data) {
    this.fire('remove', data);
  }
}

const displayHandle = handle => {
  let name = handle.type.getEntitySchema().names[0];
  if (handle.type.isCollection) {
    name = `[${name}]`;
  }
  userTable.onAdd({key: handle.storageKey.split('/').pop(), description: name, deleted: false});
};

//const profile = {};

const profileListenerFactory = () => ({
  add: async function(data) {
    //console.log(this.info, data);
    const key = this.info.type.toString();
    entitiesTable.onAdd({key, description: JSON.stringify(data.rawData)});
    //const entry = profile[key] || (profile[key] = []);
    //entry.push(data);
    const typeName = this.info.type.getEntitySchema().names[0];
    if (typeName === 'UserName') {
      const {publicKey} = data.rawData;
      console.log(publicKey);
      friendsTable.addRow(data.id, [publicKey]);
      const store = await SyntheticStores.getStore(publicKey, 'user-launcher');
      new StoreObserver(store, handlesListenerFactory(arcMetaListener));
    }
  }
});

const handlesListenerFactory = dataListener => ({
  add: async handle => {
    //console.log(handle);
    displayHandle(handle);
    const store = await SyntheticStores.getHandleStore(handle);
    dataListener.info = handle;
    new StoreObserver(store, dataListener);
  }
});

const arcMetaListener = {
  add: async data => {
    metaTable.onAdd(data.rawData);
    //console.log(data.rawData);
    const {key, deleted} = data.rawData;
    if (!deleted) {
      const store = await SyntheticStores.getStore(storage, key);
      if (store) {
        // get list of handles in user-launcher
        new StoreObserver(store, handlesListenerFactory(profileListenerFactory()));
      }
    }
  }
};

const storage = `firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_7_0/sjmiles`;

(async () => {
  //const shareOb = new ArcObserver(key, 'user-launcher', userTable);
  //
  //
  const store = await SyntheticStores.getStore(storage, 'user-launcher');
  if (store) {
    // get list of handles in user-launcher
    new StoreObserver(store, handlesListenerFactory(arcMetaListener));
  }
})();

