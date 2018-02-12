/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import ArcsUtils from "../lib/arcs-utils.js";
import Xen from '../../components/xen/xen.js';
const Arcs = window.Arcs;

class ArcHandle extends Xen.Base {
  static get observedAttributes() { return ['arc', 'options', 'data']; }
  async _update(props, state, lastProps) {
    let lastData = lastProps.data;
    let {arc, options, data} = props;
    if (arc && !state.handle) {
      if (!state.manifest && options && options.schemas) {
        Arcs.Manifest.load(options.schemas, arc.loader).then(manifest => this._setState({manifest}));
      }
      if (state.manifest && options) {
        state.handle = await this._createHandle(arc, state.manifest, options);
      }
      lastData = null;
    }
    if (state.handle && data != lastData) {
      // (re)populate
      this._updateHandle(state.handle, data, arc);
      //this._fire('handle', state.handle);
    }
  }
  async _createHandle(arc, manifest, {name, tags, type, id, asContext}) {
    let handleOf = false;
    if (type[0] == '[') {
      handleOf = true;
      type = type.slice(1, -1);
    }
    let schema = manifest.findSchemaByName(type);
    let typeOf = handleOf ? schema.type.setViewOf() : schema.type;
    tags = tags.concat(['#nosync']);
    id = id || arc.generateID();
    let handle;
    if (asContext) {
      // manifest-handle, for `map`, `copy`, `?`
      handle = await arc.context.newView(typeOf, name, id, tags);
    } else {
      // arc-handle, suitable for `use`, `?`
      handle = await arc.createHandle(typeOf, name, id, tags);
    }
    // observe handle
    handle.on('change', () => this._handleChanged(handle), arc);
    ArcHandle.log('created handle', name, tags);
    return handle;
  }
  _updateHandle(handle, data, arc) {
    ArcHandle.log('updating handle', handle.name, data);
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
ArcHandle.log = Xen.Base.logFactory('ArcHandle', '#c6a700');
customElements.define('arc-handle', ArcHandle);
