/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Type} from '../../build/types/lib-types.js';
import {Arc} from '../../build/runtime/arc.js';

export class Stores {
  static async create(context, options) {
    const schemaType = Type.fromLiteral(options.schema);
    const typeOf = options.isCollection ? schemaType.collectionOf() : schemaType;
    const store = await this.requireStore(context, typeOf, options);
    return store;
  }
  static async requireStore(context, type, {name, id, tags, claims, storageKey}) {
    const store = context.findStoreById(id);
    if (store) {
      return store;
    }
    return await this.createStore(context, type, {name, id, tags, claims, storageKey});
  }
  static async createStore(context, type, {name, id, tags, claims, storageKey}) {
    if (context instanceof Arc) {
      return await context.createStore(type, name, id, tags, claims, storageKey);
    } else {
      return await ManifestPatch.createStore.call(context, type, name, id, tags, claims, storageKey);
    }
  }
}

const ManifestPatch = {
  async createStore(type, name, id, tags, claims, storageKey) {
    const store = await this.storageProviderFactory.construct(id, type, storageKey || `volatile://${this.id}`);
    claims = claims || [];
    //assert(store.version !== null);
    store.storeInfo = {...store.storeInfo, name, claims};
    //this.storeManifestUrls.set(store.id, this.fileName);
    return ManifestPatch.addStore.call(this, store, tags);
  },
  addStore(store, tags) {
     this._stores.push(store);
     this.storeTags.set(store, tags ? tags : []);
     return store;
  }
};
