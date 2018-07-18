/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';
import Arcs from '../lib/arcs.js';
import ArcsUtils from '../lib/arcs-utils.js';

const log = Xen.logFactory('ArcStore', '#c6a700');

class ArcStore extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['arc', 'options', 'data']; }
  async _update(props, state, oldProps) {
    if (state.working) {
      state.invalid = true;
      return;
    }
    let {arc, options, data} = props;
    if (arc && state.arc !== arc) {
      state.arc = arc;
      // drop stale store on the floor (will it GC?)
      state.store = null;
    }
    if (arc && !state.store) {
      state.working = true;
      if (options && options.manifest) {
        state.manifest = options.manifest;
      }
      if (!state.manifest && options && options.schemas) {
        state.manifest = await Arcs.Manifest.load(options.schemas, arc.loader);
      }
      if (options && (state.manifest || options.schema)) {
        state.store = await this._attachStore(arc, state.manifest, options);
        state.data = null;
        this._fire('store', state.store);
      }
      state.working = false;
      if (state.invalid) {
        this._invalidate();
        state.invalid = false;
      }
    }
    if (arc && state.store && data != state.data) {
      state.data = data;
      // (re)populate
      this._updateStore(state.store, data, arc);
    }
  }
  async _attachStore(arc, manifest, options) {
    let store;
    const {id, description, asContext} = options;
    // context-stores are for `map`, `copy`, `?`
    // arc-stores are for `use`, `?`
    const owner = asContext ? arc.context : arc;
    if (id) {
      store = owner.findStoreById(id);
    }
    if (!store) {
      store = await this._createStore(arc, manifest, options);
    }
    // observe store
    store.on('change', () => this._storeChanged(store), arc);
    if (description) {
      store.description = description;
    }
    return store;
  }
  async _createStore(arc, manifest, {name, tags, schema, type, id, asContext, storageKey}) {
    const owner = asContext ? arc.context : arc;
    // work out typeOf
    let setOf = false;
    if (type[0] == '[') {
      setOf = true;
      type = type.slice(1, -1);
    }
    let typeOf;
    if (schema) {
      typeOf = Arcs.Type.fromLiteral(schema);
    } else {
      typeOf = manifest.findSchemaByName(type).type;
    }
    typeOf = setOf ? typeOf.collectionOf() : typeOf;
    // work out storageKey
    storageKey = storageKey || 'in-memory';
    // work out tags
    if (!asContext) {
      tags = tags.concat(['nosync']);
    }
    // work out id
    id = id || arc.generateID();
    // create store
    const store = await owner.createStore(typeOf, name, id, tags, storageKey);
    log('created store', name, tags, store);
    return store;
  }
  _updateStore(store, data, arc) {
    log('updating store', store.name, data);
    if (store.toList) {
      data = Object.keys(data).map(key => {
        return {id: arc.generateID(), rawData: data[key]};
      });
    } else {
      data = {id: arc.generateID(), rawData: data};
    }
    ArcsUtils.setStoreData(store, data);
  }
  _storeChanged(store) {
    store.debouncer = Xen.debounce(store.debouncer, () => this._fire('change', store), 500);
  }
}
customElements.define('arc-store', ArcStore);
