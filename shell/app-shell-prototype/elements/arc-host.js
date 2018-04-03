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
const error = Xen.logFactory('ArcHost', '#007ac1', 'error');

class ArcHost extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'config', 'manifest', 'plans', 'suggestions', 'plan', 'serialization'];
  }
  _getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  _willReceiveProps(props, state, lastProps) {
    const changed = name => props[name] !== lastProps[name];
    const {key, manifest, config, plan, suggestions, serialization} = props;
    if (config && (config !== state.appliedConfig) && manifest && key && (key !== '*')) {
      state.id = null;
      state.appliedConfig = config;
      this._initArc(config, manifest, key);
    }
    // TODO(sjmiles): absence of serialization is null/undefined,
    // an empty serialization is empty string
    if (serialization != null && changed('serialization')) {
      state.pendingSerialization = serialization;
    }
    /*
    if (state.arc && changed('manifest')) {
      log('reloading');
      this._reloadManifest(state.arc, config, manifest);
    }
    */
    if (plan && changed('plan')) {
      state.pendingPlans.push(plan);
    }
    if (suggestions && changed('suggestions')) {
      state.slotComposer.setSuggestions(suggestions);
    }
  }
  _update({plans}, state) {
    const {id, arc, pendingPlans, pendingSerialization} = state;
    if (pendingSerialization != null && id) {
      this._consumeSerialization(arc, pendingSerialization);
      state.pendingSerialization = null;
    }
    if (arc && pendingPlans.length) {
      this._instantiatePlan(arc, pendingPlans.shift());
    }
    if (arc && !plans) {
      this._schedulePlanning();
    }
  }
  async _initArc(config, manifest, key) {
    await this._createArc(config, manifest, key);
    /*
    // TODO(sjmiles): IIUC callback that is invoked by runtime onIdle event
    arc.makeSuggestions = () => this._runtimeHandlesUpdated();
    log('created arc', arc);
    this._setState({arc});
    this._fire('arc', arc);
    */
  }
  async _createArc(config, manifest, key) {
    // make an id
    const id = 'app-shell-' + ArcsUtils.randomId();
    // create a system loader
    const loader = this._createLoader(config);
    // load manifest
    const context = await this._createContext(loader, manifest);
    // composer
    //const slotComposer = this._createSlotComposer(config);
    // need urlMap so worker-entry*.js can create mapping loaders
    const urlMap = loader._urlMap;
    // pec factory
    const pecFactory = ArcsUtils.createPecFactory(urlMap);
    // construct storageKey
    const storageKey = `${Firebase.storageKey}/arcs/${key}`;
    // capture composer (so we can push suggestions there), loader, etc.
    this._setState({id, loader, context, pecFactory, /*, slotComposer*/urlMap, storageKey});
    // Arc!
    //return ArcsUtils.createArc({id, urlMap, slotComposer, context, loader, storageKey});
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
    // TODO(sjmiles): do we need to be able to `config` this value?
    const manifestFileName = './shell.manifest';
    let context;
    try {
      context = await ArcsUtils.parseManifest(manifestFileName, content, loader);
    } catch (x) {
      warn(x);
      context = ArcsUtils.parseManifest(manifestFileName, '', loader);
    }
    return context;
  }
  _createSlotComposer(config) {
    return new Arcs.SlotComposer({
      rootContext: document.body,
      affordance: config.affordance,
      containerKind: config.containerKind,
      // TODO(sjmiles): typically resolved via `slotid="suggestions"`, but override is allowed here via config
      suggestionsContext: config.suggestionsNode
    });
  }
  async _reloadManifest(arc, config, manifest) {
    //arc._context = await this._createContext(loader, manifest);
    //this._fire('plans', null);
  }
  _runtimeHandlesUpdated() {
    !this._state.planning && log('runtimeHandlesUpdated');
    this._schedulePlanning();
  }
  async _schedulePlanning() {
    const state = this._state;
    // results obtained before now are invalid
    state.invalid = true;
    // only wait for one _beginPlanning at a time
    if (!state.planning) {
      state.planning = true;
      try {
        await this.__beginPlanning(state, this._props);
      } catch (x) {
        error(x);
      }
      state.planning = false;
    }
  }
  // TODO(sjmiles): only to be called from _schedulePlanning which protects re-entrancy
  async __beginPlanning(state, props) {
    log(`planning...`);
    let time = Date.now();
    let plans;
    while (state.invalid) {
      state.invalid = false;
      plans = await ArcsUtils.makePlans(state.arc, props.config.plannerTimeout) || [];
    }
    time = ((Date.now() - time) / 1000).toFixed(2);
    log(`plans`, plans, `${time}s`);
    this._fire('plans', plans);
  }
  async _instantiatePlan(arc, plan) {
    // aggressively remove old suggestions when a suggestion is applied
    this._setState({suggestions: []});
    log('instantiated plan', plan);
    await arc.instantiate(plan);
    this._fire('plan', plan);
  }
  async _consumeSerialization(arc, serialization) {
    if (arc) {
      // Clean up from last arc
      Arcs.DomSlot.dispose();
      Array.from(document.querySelectorAll('[slotid]')).forEach(n => n.textContent = '');
      // old arc is no more
      this._fire('arc', null);
      this._setState({arc: null});
    }
    //
    const {config, manifest} = this._props;
    const state = this._state;
    //
    const badImport = `import './shell.manifest'`;
    if (serialization.includes(badImport)) {
      serialization = serialization.replace(badImport, '');
      log(`serialization contained [${badImport}]`);
    }
    //serialization = `${manifest}\n${serialization}`;
    //
    // serialize old arc
    groupCollapsed('serialized arc:');
    log(serialization);
    groupEnd();
    // generate new slotComposer
    const slotComposer = this._createSlotComposer(config);
    let newArc;
    if (serialization) {
      // generate new arc via deserialization
      newArc = await Arcs.Arc.deserialize({
        serialization,
        fileName: './serialized.manifest',
        //
        pecFactory: state.pecFactory,
        slotComposer,
        loader: state.loader,
        context: state.context,
        storageKey: state.storageKey
      });
    } else {
      newArc = new Arcs.Arc({
        id: state.id,
        //
        pecFactory: state.pecFactory,
        slotComposer,
        loader: state.loader,
        context: state.context,
        storageKey: state.storageKey
      });
    }
    newArc.makeSuggestions = () => this._runtimeHandlesUpdated();
    // cache new objects
    this._setState({slotComposer, arc: newArc});
    // notify owner
    this._fire('arc', newArc);
    this._fire('plans', null);
  }
}
ArcHost.groupCollapsed = Xen.logFactory('ArcHost', '#007ac1', 'groupCollapsed');
customElements.define('arc-host', ArcHost);
