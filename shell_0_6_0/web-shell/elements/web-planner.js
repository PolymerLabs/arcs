/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';

const log = Xen.logFactory('WebPlanner', '#104a91');
const error = Xen.logFactory('WebPlanner', '#104a91', 'error');

// proposed:
// metaplans -> map of plans, generations
// metaplan -> map of plans, generations, plan
// suggestions -> filtered array of (simple-)plans
// suggestion -> (simple-)plan

// TODO(sjmiles): requires more info than this module should need
const PlanificatorFactory = async (config, env, userid, arc) =>
  await env.lib.Planificator.create(arc, {userid, protocol: config.planificatorProtocol});

class WebPlanner extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'config', 'userid', 'arc', 'suggestion', 'search'];
  }
  _getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  _update({env, config, userid, arc, search}, state) {
    const {planificator} = state;
    if (planificator && planificator.arc !== arc && planificator._arc !== arc) {
      planificator.dispose();
      state.planificator = null;
      state.search = null;
      log('planificator was disposed');
    }
    if (env && config && arc && !state.planificator) {
      this.awaitState('planificator', () => this._createPlanificator(env, config, arc, userid));
    }
    if (state.planificator && search !== state.search) {
      state.search = search;
      state.planificator.setSearch(state.search);
    }
  }
  async _createPlanificator(env, config, arc, userid) {
    const planificator = await PlanificatorFactory(config, env, userid, arc);
    planificator.registerSuggestionsChangedCallback(current => this._plansChanged(current, planificator.getLastActivatedPlan()));
    planificator.registerVisibleSuggestionsChangedCallback(suggestions => this._suggestionsChanged(suggestions));
    planificator.loadSuggestions && await planificator.loadSuggestions();
    // for debugging only
    window.planificator = planificator;
    return planificator;
  }
  _plansChanged(metaplans, metaplan) {
    log('plansChanged', metaplans, metaplan);
  //   this._fire('metaplans', metaplans);
  //   this._fire('metaplan', metaplan);
  }
  _suggestionsChanged(suggestions) {
    log('suggestionsChanged', suggestions);
  //   this._fire('suggestions', suggestions);
  }
  // async _instantiatePlan(arc, plan) {
  //   log('instantiating plan', plan);
  //   try {
  //     await arc.instantiate(plan);
  //   } catch (x) {
  //     error('plan instantiation failed', x);
  //   }
  //   // need new suggestions
  //   this._fire('suggestions', null);
  // }
}

customElements.define('web-planner', WebPlanner);
