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

// proposed:
// plans -> map of plans, generations
// plan -> map of plans, generations, (simple-)plan
// suggestions -> filtered array of (simple-)plans
// suggestion -> (simple-)plan

class ArcPlanner extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'arc', 'suggestion', 'search'];
  }
  _getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  _willReceiveProps(props, state, oldProps) {
    const {arc, suggestion, search} = props;
    const changed = name => props[name] !== oldProps[name];
    if (suggestion && changed('suggestion')) {
      state.pendingPlans.push(suggestion.plan);
    }
    if (arc) {
      let {planificator} = state;
      if (planificator && changed('arc')) {
        // TODO(sjmiles): need `dispose` routine for planificator
        planificator._plansChangedCallbacks = [];
        planificator._suggestChangedCallbacks = [];
        planificator._stateChangedCallbacks = [];
        planificator = null;
      }
      if (!planificator) {
        planificator = new Arcs.Planificator(arc);
        planificator.registerPlansChangedCallback(current => this._plansChanged(current, planificator.getLastActivatedPlan()));
        planificator.registerSuggestChangedCallback(suggestions => this._suggestionsChanged(suggestions));
        planificator.setSearch(search);
      } else if (changed('search')) {
        planificator.setSearch(search);
      }
      this._setState({planificator});
    }
  }
  _update({arc, suggestions, search, planificator}, {pendingPlans}) {
    if (arc && pendingPlans.length) {
      this._instantiatePlan(arc, pendingPlans.shift());
    }
  }
  _plansChanged(context, plan) {
    this._fire('plans', context);
    this._fire('plan', plan);
  }
  _suggestionsChanged(suggestions) {
    this._fire('suggestions', suggestions);
  }
  async _instantiatePlan(arc, plan) {
    log('instantiating plan', plan);
    await arc.instantiate(plan);
    // search term is used up
    this._fire('search', '');
    // need new suggestions
    this._fire('suggestions', null);
  }
}
customElements.define('arc-planner', ArcPlanner);
