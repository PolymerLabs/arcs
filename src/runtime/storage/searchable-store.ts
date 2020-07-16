import {Type} from '../type.js';
import {Manifest} from '../manifest.js';
import {ToStore} from './storage.js';
import {AbstractStore} from './abstract-store.js';

// TODO(alxr) name bike-shedding: `StoreClosure`? `StoreContext`? `StoreHolder` Other ideas?
export interface SearchableStore {
  context: Manifest;
  findStoresByType<T extends Type>(type: T, options?: { tags: string[] }): ToStore<T>[];
  findStoreById(id: String): AbstractStore;
}
