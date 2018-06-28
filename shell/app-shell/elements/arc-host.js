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
import Firebase from './cloud-data/firebase.js';

const log = Xen.logFactory('ArcHost', '#007ac1');
const groupCollapsed = Xen.logFactory('ArcHost', '#007ac1', 'groupCollapsed');
const groupEnd = Xen.logFactory('ArcHost', '#007ac1', 'groupEnd');
const warn = Xen.logFactory('ArcHost', '#007ac1', 'warn');
//const error = Xen.logFactory('ArcHost', '#007ac1', 'error');

class ArcHost extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'key', 'manifest', 'serialization'];
  }
  _willReceiveProps(props, state, oldProps) {
    const changed = name => props[name] !== oldProps[name];
    const {key, manifest, config, serialization} = props;
    if (config && manifest && !state.context) {
      this._prepareContext(config, manifest);
    }
    // dispose arc if key has changed, but we don't have a new key yet
    if (key === '*' && changed('key')) {
      this._teardownArc(state.arc);
    }
    // rebuild arc if we have all the parts, but one of them has changed
    if (state.context && config && manifest && key && (key !== '*') && (changed('config') || changed('key') || changed('manifest'))) {
      state.id = null;
      this._teardownArc(state.arc);
      this._prepareArc(config, key);
    }
    // TODO(sjmiles): absence of serialization is null/undefined, as opposed to an
    // empty serialization which is ''
    if (serialization != null && changed('serialization')) {
      state.pendingSerialization = serialization;
    }
  }
  async _update({}, state) {
    const {id, context, pendingSerialization} = state;
    if (id && context && pendingSerialization != null) {
      state.pendingSerialization = null;
      state.pendingSerialization = await this._consumeSerialization(pendingSerialization);
    }
  }
  async _prepareContext(config, manifest) {
    log('context preparation');
    // create a system loader
    const loader = this._createLoader(config);
    // load manifest
    const context = await this._createContext(loader, manifest);
    // need urlMap so worker-entry*.js can create mapping loaders
    const urlMap = loader._urlMap;
    // pec factory
    const pecFactory = ArcsUtils.createPecFactory(urlMap);
    // capture composer (so we can push suggestions there), loader, etc.
    this._setState({loader, context, pecFactory, urlMap});
    // share context
    this._fire('context', context);
  }
  _createLoader(config) {
    // create default URL map
    const urlMap = ArcsUtils.createUrlMap(config.root);
    // create a system loader
    // TODO(sjmiles): `pecFactory` creates loader objects (via worker-entry*.js) for the innerPEC,
    // but we have to create one by hand for manifest loading
    const loader = new Arcs.BrowserLoader(urlMap);
    // add `urls` to `urlMap` after a resolve pass
    if (config.urls) {
      Object.keys(config.urls).forEach(k => urlMap[k] = loader._resolve(config.urls[k]));
    }
    return loader;
  }
  async _createContext(loader, content) {
    let context;
    // TODO(sjmiles): do we need to be able to `config` this value?
    const manifestFileName = './in-memory.manifest';
    try {
      context = await ArcsUtils.parseManifest(manifestFileName, content, loader);
    } catch (x) {
      warn(x);
      context = ArcsUtils.parseManifest(manifestFileName, '', loader);
    }
    return context;
  }
  _teardownArc(arc) {
    if (arc) {
      log('------------');
      log('arc teardown');
      log('------------');
      arc.dispose();
      // clean out DOM nodes
      Array.from(document.querySelectorAll('[slotid]')).forEach(n => n.textContent = '');
      // old arc is no more
      this._setState({arc: null});
      this._fire('arc', null);
    }
  }
  async _prepareArc(config, key) {
    log('---------------');
    log('arc preparation');
    log('---------------');
    // make an id
    const id = 'app-shell-' + ArcsUtils.randomId();
    // construct storageKey
    const storageKey = config.useStorage ? `${Firebase.storageKey}/arcs/${key}` : null;
    // capture composer (so we can push suggestions there), loader, etc.
    this._setState({id, storageKey});
  }
  _createSlotComposer(config) {
    return new Arcs.SlotComposer({
      rootContainer: document.body,
      affordance: config.affordance,
      containerKind: config.containerKind,
      // TODO(sjmiles): typically resolved via `slotid="suggestions"`, but override is allowed here via config
      suggestionsContext: config.suggestionsNode
    });
  }
  async _consumeSerialization(serialization) {
    const {config, manifest} = this._props;
    const state = this._state;
    //
    // generate new slotComposer
    const slotComposer = this._createSlotComposer(config);
    // collate general params for arc construction
    const params = {
      pecFactory: state.pecFactory,
      slotComposer,
      loader: state.loader,
      context: state.context,
      storageKey: state.storageKey
    };
    // attempt to construct arc
    let arc;
    try {
      arc = await this._constructArc(state.id, serialization, params);
    } catch (x) {
      warn('failed to deserialize arc, will retry');
      return serialization;
    }
    // notify console
    if (serialization) {
      groupCollapsed('deserialized arc:');
      log('serialization:', serialization);
      groupEnd();
    }
    // cache new objects
    this._setState({slotComposer, arc});
    // no suggestions yet
    this._fire('suggestions', null);
    // new arc
    this._fire('arc', arc);
  }
  async _constructArc(id, serialization, params) {
    if (serialization) {
      Object.assign(params, {
        serialization,
        fileName: './serialized.manifest'
      });
      // generate new arc via deserialization
      try {
        return await Arcs.Arc.deserialize(params);
      } catch (x) {
        return null;
      }
    } else {
      Object.assign(params, {
        id: id
      });
      return new Arcs.Arc(params);
    }
  }
}
customElements.define('arc-host', ArcHost);
