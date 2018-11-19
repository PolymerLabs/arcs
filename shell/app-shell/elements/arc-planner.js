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
import Arcs from '../../lib/arcs.js';
import ArcsUtils from '../../lib/arcs-utils.js';

const log = Xen.logFactory('ArcPlanner', '#104a91');
const error = Xen.logFactory('ArcPlanner', '#104a91', 'error');

// proposed:
// metaplans -> map of plans, generations
// metaplan -> map of plans, generations, plan
// suggestions -> filtered array of (simple-)plans
// suggestion -> (simple-)plan

class ArcPlanner extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'arc', 'suggestion', 'search', 'userid'];
  }
  _getInitialState() {
    return {
      pendingSuggestions: [],
      invalid: 0
    };
  }
  async _willReceiveProps(props, state, oldProps) {
    const changed = name => props[name] !== oldProps[name];
    const {arc, suggestion, search, userid} = props;
    if (suggestion && changed('suggestion')) {
      state.pendingSuggestions.push(suggestion);
    }
    if (arc && userid) {
      let {planificator} = state;
      if (changed('arc') || changed('userid')) {
        state.pendingSuggestions = [];
        if (planificator) {
          planificator.dispose();
          planificator = null;
        }
      }
      if (!planificator) {
        planificator = await this._createPlanificator(arc, userid);
        planificator.loadPlans && await planificator.loadPlans();
        planificator.setSearch(search);
      } else if (changed('search')) {
        planificator.setSearch(search);
      }
      this._setState({planificator});
    }
  }
  _update({arc}, {pendingSuggestions}) {
    if (arc && pendingSuggestions.length) {
      this._instantiateSuggestion(arc, pendingSuggestions.shift());
    }
  }
  async _createPlanificator(arc, userid) {
    const planificatorParam = ArcsUtils.getUrlParam('planificator');
    const onlyConsumer = ArcsUtils.getUrlParam('onlyConsumer') === 'true';
    const planificator = planificatorParam === 'original'
        ? new Arcs.Planificator(arc, {userid})
        : await Arcs.PlanificatorNew.create(arc, {userid, protocol: ArcsUtils.getUrlParam('planificatorProtocol') || 'volatile', onlyConsumer});
    planificator.registerPlansChangedCallback(current => this._plansChanged(current, planificator.getLastActivatedPlan()));
    planificator.registerSuggestChangedCallback(suggestions => this._suggestionsChanged(suggestions));
    window.planificator = planificator;
    return planificator;
  }
  _plansChanged(metaplans, metaplan) {
    this._fire('metaplans', metaplans);
    this._fire('metaplan', metaplan);
  }
  _suggestionsChanged(suggestions) {
    this._fire('suggestions', suggestions);
  }
  async _instantiateSuggestion(arc, suggestion) {
    log('instantiating plan', suggestion.plan);
    try {
      await suggestion.instantiate();
    } catch (x) {
      error('plan instantiation failed', x);
    }
    // need new suggestions
    this._fire('suggestions', null);
  }
}
customElements.define('arc-planner', ArcPlanner);
