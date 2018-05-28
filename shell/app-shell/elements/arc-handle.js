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

const log = Xen.logFactory('ArcHandle', '#c6a700');

class ArcHandle extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() { return ['arc', 'options', 'data']; }
  async _update(props, state, oldProps) {
    let {arc, options, data} = props;
    if (oldProps.arc && oldProps.arc !== arc) {
      // drop stale handle on the floor (will it GC?)
      state.handle = null;
    }
    if (arc && !state.handle) {
      if (state.working) {
        state.invalid = true;
        return;
      }
      state.working = true;
      if (options && options.manifest) {
        state.manifest = options.manifest;
      }
      if (!state.manifest && options && options.schemas) {
        state.manifest = await Arcs.Manifest.load(options.schemas, arc.loader);
      }
      if (state.manifest && options) {
        state.handle = await this._createHandle(arc, state.manifest, options);
        state.data = null;
      }
      state.working = false;
      if (state.invalid) {
        this._invalidate();
        state.invalid = false;
      }
    }
    if (arc && state.handle && data != state.data) {
      state.data = data;
      // (re)populate
      this._updateHandle(state.handle, data, arc);
    }
  }
  async _createHandle(arc, manifest, {name, tags, type, id, asContext, description}) {
    let setOf = false;
    if (type[0] == '[') {
      setOf = true;
      type = type.slice(1, -1);
    }
    const schema = manifest.findSchemaByName(type);
    const typeOf = setOf ? schema.type.collectionOf() : schema.type;
    tags = tags.concat(['#nosync']);
    const storageKey = 'in-memory';
    id = id || arc.generateID();
    // context-handles are for `map`, `copy`, `?`
    // arc-handles are for `use`, `?`
    const factory = asContext ? arc.context.newStore.bind(arc.context) : arc.createStore.bind(arc);
    const handle = await factory(typeOf, name, id, tags, storageKey);
    if (description) {
      handle.description = description;
    }
    // observe handle
    handle.on('change', () => this._handleChanged(handle), arc);
    log('created handle', name, tags);
    return handle;
  }
  _updateHandle(handle, data, arc) {
    log('updating handle', handle.name, data);
    if (handle.toList) {
      data = Object.keys(data).map(key => {
        return {id: arc.generateID(), rawData: data[key]};
      });
    } else {
      data = {id: arc.generateID(), rawData: data};
    }
    ArcsUtils.setHandleData(handle, data);
  }
  _handleChanged(handle) {
    handle.debouncer = ArcsUtils.debounce(handle.debouncer, () => this._fire('change', handle), 500);
  }
}
customElements.define('arc-handle', ArcHandle);
