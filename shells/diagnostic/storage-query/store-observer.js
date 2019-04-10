import {logFactory} from '../../../build/platform/log-web.js';
import {forEachEntity, listenToStore} from './utils.js';

// sanity check
let observers = 0;

export const simulateInitialChanges = async (store, onchange) => {
  if (store.toList) {
    const data = await store.toList();
    const add = data.filter(value => Boolean(value)).map(value => ({value}));
    onchange({add});
    data.forEach(value => value && onchange(value));
  } else {
    const data = await store.get();
    onchange({data});
  }
};

export class StoreObserver {
  constructor(store, listener, owner) {
    observers++;
    this.store = store;
    this.listener = listener;
    this.owner = owner;
    this.log = logFactory('StoreObserver', 'orange');
    // TODO(sjmiles): connecting is async, beware race-condition vs. dispose()
    // dispose should await a ready condition
    this._connect(store);
  }
  async _connect(store) {
    // observe addition of all entities
    await simulateInitialChanges(store, change => this.onChange(change));
    //await forEachEntity(store, value => this.add(value));
    // observe future changes (and record ability to stop observation)
    this.off = listenToStore(store, change => this.onChange(change));
  }
  async dispose() {
    // sanity check
    if (--observers === 0) {
      console.warn(`all observers disposed (generally a good thing)`);
    }
    // stop observing store
    this.off();
    // observe removal of all entities
    await forEachEntity(this.store, value => this.remove(value));
  }
  onChange(change) {
    //this.log('onChange', change);
    const {add, remove, data} = change;
    if (data) {
      // TODO(sjmiles): strip off version indicator (kosher?)
      //data.id = data.id.split(':').slice(0, -1).join(':');
      //this.log('removed version tag from data.id', data.id);
      this.add(data);
    }
    if (add) {
      add.forEach(({value}) => this.add(value));
    }
    if (remove) {
      remove.forEach(({value}) => this.remove(value));
    }
  }
  add(value) {
    this.listener.add(value, this.store);
  }
  remove(value) {
    this.listener.remove(value, this.store);
  }
}
