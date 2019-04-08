import '../../lib/firebase-support.js';
import '../../lib/loglevel-web.js';
import {logFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';
import {ObserverTable} from './observer-table.js';

const userTable = new ObserverTable('user');
const metaTable = new ObserverTable('meta');
const entitiesTable = new ObserverTable('entities');
const friendsTable = new ObserverTable('friends');

const displayHandle = handle => {
  let name = handle.type.getEntitySchema().names[0];
  if (handle.type.isCollection) {
    name = `[${name}]`;
  }
  userTable.onAdd({key: handle.storageKey.split('/').pop(), description: name, deleted: false});
};

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
  constructor(listener, owner) {
    this.listener = listener;
    this.owner = owner;
  }
  fire(name, data) {
    if (this.listener && this.listener[name]) {
      return this.listener[name](data, this.owner);
    }
  }
  dispose() {
  }
}

class StoreObserver extends AbstractEventer {
  constructor(store, listener, owner) {
    super(listener, owner);
    const key = store.storageKey.split('/')[3];
    this.log = logFactory(`StoreObserver[${key}::${store.id}]`, 'green');
    this.store = store;
    this.connect(store);
  }
  async connect(store) {
    if (store.toList) {
      await this.notifyInitialPopulation(store);
      const onchange = change => this.onChange(change);
      store.on('change', onchange, this);
      this.dispose = () => store.off(onchange);
    }
  }
  onChange({add, remove}) {
    this.log('onChange', add, remove);
    //console.log({add, remove});
    if (add) {
      add.forEach(({value}) => this.fire('add', value));
    }
    if (remove) {
      remove.forEach(({value}) => this.fire('remove', value));
    }
  }
  async notifyInitialPopulation(store) {
    // process initial data
    this.log('initial population');
    // TODO(sjmiles): assumes Collection
    const data = await store.toList();
    data.forEach(value => this.fire('add', value));
  }
}

const AbstractListener = class {
  constructor(listener) {
    this.listener = listener;
  }
  observe(store, owner) {
    new StoreObserver(store, this.listener, owner);
  }
};

const BoxListener = class extends AbstractListener {
  async add(data, {handle}) {
    const key = handle.type.toString();
    const typeName = handle.type.getEntitySchema().names[0];
    entitiesTable.onAdd({key, description: JSON.stringify(data.rawData)});
  }
};

const ProfileListener = class extends AbstractListener {
  async add(data, {owner, handle}) {
    const key = handle.type.toString();
    const typeName = handle.type.getEntitySchema().names[0];
    //entitiesTable.onAdd({key, description: JSON.stringify(data.rawData)});
    const user = owner.owner.split('/').pop();
    entitiesTable.addRow(handle.id, [user, JSON.stringify(data.rawData)]);
    if (typeName === 'Friend') {
      const {publicKey} = data.rawData;
      friendsTable.addRow(data.id, [publicKey]);
      const store = await SyntheticStores.getStore(publicKey, 'user-launcher');
      this.observe(store, data);
    }
  }
};

const HandlesListener = class extends AbstractListener {
  async add(handle, owner) {
    //console.log(handle);
    displayHandle(handle);
    const store = await SyntheticStores.getHandleStore(handle);
    this.observe(store, {store, owner, handle});
  }
};

const ArcMetaListener = class extends AbstractListener {
  async add(data, {owner}) {
    metaTable.onAdd(data.rawData);
    const {key, deleted} = data.rawData;
    if (!deleted) {
      const store = await SyntheticStores.getStore(storage, key);
      if (store) {
        // get list of handles in user-launcher
        this.observe(store, {store, owner, data});
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
    const chain = [ArcMetaListener, ProfileListener, ArcMetaListener, BoxListener];
    //const chain = [HandlesListener, ArcMetaListener, HandlesListener, ProfileListener, HandlesListener, ArcMetaListener, HandlesListener, BoxListener];
    let listener = null;
    while (chain.length) {
      listener = new HandlesListener(new (chain.pop())(listener));
    }
    // get list of handles in user-launcher
    new StoreObserver(store, listener, storage);
    //new HandlesListener(new ArcMetaListener(new HandlesListener(new ProfileListener(new HandlesListener(new ArcMetaListener()))))));
  }
})();

