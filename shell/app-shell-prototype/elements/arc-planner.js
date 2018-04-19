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

const log = Xen.logFactory('ArcPlanner', '#104a91');
const error = Xen.logFactory('ArcPlanner', '#104a91', 'error');

class ArcPlanner extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'arc', 'suggestions', 'suggestion', 'search'];
  }
  _getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  _willReceiveProps(props, state, oldProps) {
    const changed = name => props[name] !== oldProps[name];
    const {arc, suggestions, suggestion} = props;
    if (suggestion && changed('suggestion')) {
      state.pendingPlans.push(suggestion.plan);
    }
    if (arc && changed('arc')) {
      if (oldProps.arc) {
        oldProps.arc.makeSuggestions = null;
      }
      arc.makeSuggestions = () => this._runtimeHandlesUpdated();
    }
  }
  _update({arc, suggestions, search}, {pendingPlans}) {
    if (arc && pendingPlans.length) {
      this._instantiatePlan(arc, pendingPlans.shift());
    }
    if (arc && !suggestions) {
      //this._schedulePlanning();
      // TODO(sjmiles): experiment, change name of this method if keeping this code
      this._runtimeHandlesUpdated();
    }
    if (arc && (search != null)) {
      search = search.trim().toLowerCase();
      // TODO(sjmiles): setting search to '' causes an exception at init-search.js|L#29)
      search = (search !== '') && (search !== '*') ? search : null;
      // re-plan only if the search has changed (beyond simple filtering)
      if (search !== arc.search) {
        arc.search = search;
        this._fire('suggestions', null);
      }
    }
  }
  _runtimeHandlesUpdated() {
    !this._state.invalid && log('runtimeHandlesUpdated');
    const replan = () => {
      log('replanning from debounced runtimeHandlesUpdated');
      // results obtained before now are invalid
      this._state.invalid = true;
      this._schedulePlanning();
    };
    this._debouncer = ArcsUtils.debounce(this._debouncer, replan, 1000);
  }
  async _schedulePlanning() {
    const props = this._props;
    const state = this._state;
    if (props.arc) {
      // only wait for one _beginPlanning at a time
      if (!state.planning) {
        state.planning = true;
        try {
          await this.__beginPlanning(props, state);
        } catch (x) {
          error(x);
        }
        state.planning = false;
      }
    }
  }
  // TODO(sjmiles): only to be called from _schedulePlanning which protects re-entrancy
  async __beginPlanning(props, state) {
    log(`planning...`);
    let time = Date.now();
    let suggestions;
    do {
      state.invalid = false;
      suggestions = await ArcsUtils.makePlans(props.arc, props.config.plannerTimeout) || [];
      // if the `invalid` state goes true before `makePlans` completes, start over
    } while (state.invalid);
    time = ((Date.now() - time) / 1000).toFixed(2);
    log(`suggestions`, suggestions, `${time}s`);
    this._fire('suggestions', suggestions);
  }
  async _instantiatePlan(arc, plan) {
    log('instantiating plan', plan);
    this._state.planning = true;
    await arc.instantiate(plan);
    this._state.planning = false;
    // newly instantiated plan
    this._fire('plan', plan);
    // search term is used up
    this._fire('search', '');
    // need new suggestions
    this._fire('suggestions', null);
  }
}
customElements.define('arc-planner', ArcPlanner);
