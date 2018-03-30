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

const log = Xen.logFactory('ArcHost', '#007ac1');
const groupCollapsed = Xen.logFactory('ArcHost', '#007ac1', 'groupCollapsed');
const groupEnd = Xen.logFactory('ArcHost', '#007ac1', 'groupEnd');
const warn = Xen.logFactory('ArcHost', '#007ac1', 'warn');
const error = Xen.logFactory('ArcHost', '#007ac1', 'error');

class ArcHost extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'manifest', 'plans', 'suggestions', 'plan', 'serialization'];
  }
  _getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  _willReceiveProps(props, state, lastProps) {
    const changed = name => props[name] !== lastProps[name];
    const {manifest, config, plan, suggestions, serialization} = props;
    if (config && (config !== state.appliedConfig) && manifest) {
      state.appliedConfig = config;
      this._initArc(config, manifest);
    }
    else if (state.arc && changed('manifest')) {
      log('reloading');
      this._reloadManifest(state.arc, config, manifest);
    }
    if (plan && changed('plan')) {
      state.pendingPlans.push(plan);
    }
    if (suggestions && changed('suggestions')) {
      state.slotComposer.setSuggestions(suggestions);
    }
    if (serialization && changed('serialization')) {
      this._consumeSerialization(serialization);
    }
  }
  _update({plans}, {arc, pendingPlans}) {
    if (arc && pendingPlans.length) {
      this._instantiatePlan(arc, pendingPlans.shift());
    }
    if (arc && !plans) {
      this._schedulePlanning();
    }
  }
  async _initArc(config, manifest) {
    const arc = await this._createArc(config, manifest);
    // TODO(sjmiles): IIUC callback that is invoked by runtime onIdle event
    arc.makeSuggestions = () => this._runtimeHandlesUpdated();
    log('created arc', arc);
    this._setState({arc});
    this._fire('arc', arc);
  }
  async _createArc(config, manifest) {
    // make an id
    const id = 'demo-' + ArcsUtils.randomId();
    // create a system loader
    const loader = this._createLoader(config);
    // load manifest
    const context = await this._createContext(loader, manifest);
    // composer
    const slotComposer = this._createSlotComposer(config);
    // send urlMap to the Arc so worker-entry*.js can create mapping loaders
    const urlMap = loader._urlMap;
    // capture composer (so we can push suggestions there) and loader
    this._setState({slotComposer, loader});
    // Arc!
    return ArcsUtils.createArc({id, urlMap, slotComposer, context, loader});
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
  async _consumeSerialization(serialization) {
    // Clean up from last arc
    Arcs.DomSlot.dispose();
    Array.from(document.querySelectorAll('[slotid]')).forEach(n => n.textContent = '');
    //
    const {config, manifest} = this._props;
    const {arc, loader} = this._state;
    //
    const badImport = `import './shell.manifest'`;
    if (serialization.includes(badImport)) {
      serialization = serialization.replace(badImport, '');
      log(`serialization contained [${badImport}]`);
    }
    //
    serialization = `${manifest}\n${serialization}`;
    // serialize old arc
    groupCollapsed('serialized arc:');
    log(serialization);
    groupEnd();
    // generate new slotComposer
    const slotComposer = this._createSlotComposer(config);
    // generate new arc via deserialization
    const newArc = await Arcs.Arc.deserialize({
      serialization,
      loader,
      slotComposer,
      context: arc.context,
      pecFactory: arc._pecFactory,
      fileName: './synthetic.manifest'
    });
    // cache new arc
    this._setState({arc: newArc});
    // notify owner
    this._fire('arc', arc);
    this._fire('plans', null);
  }
}
ArcHost.groupCollapsed = Xen.logFactory('ArcHost', '#007ac1', 'groupCollapsed');
customElements.define('arc-host', ArcHost);
