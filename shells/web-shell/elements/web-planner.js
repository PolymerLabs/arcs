/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../lib/components/xen.js';
import {Planificator} from '../../../build/planning/arcs-planning.js';
import {devtoolsPlannerInspectorFactory} from '../../../build/devtools-connector/devtools-planner-inspector.js';
//import {StorageKeyParser} from '../../../build/runtime/storage/storage-key-parser.js';
import {RamDiskStorageKey} from '../../../build/runtime/storage/drivers/ramdisk.js';

const log = Xen.logFactory('WebPlanner', '#104a91');
//const error = Xen.logFactory('WebPlanner', '#104a91', 'error');

class WebPlanner extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['config', 'arc', 'search'];
  }
  getInitialState() {
    return {
      pendingPlans: [],
      invalid: 0
    };
  }
  update({config, arc, search}, state) {
    const {planificator} = state;
    if (planificator && planificator.arc !== arc && planificator._arc !== arc) {
      state.planificator = null;
      state.search = null;
      planificator.dispose();
      log('planificator is disconnected and is disposing');
    }
    if (config && arc && !state.planificator) {
      this.awaitState('planificator', async () => this._createPlanificator(config, arc));
    }
    if (state.planificator && search !== state.search) {
      state.search = search;
      state.planificator.setSearch(state.search);
    }
  }
  async _createPlanificator(config, arc) {
    const options = {
      userid: 'user',
      storageKeyBase: new RamDiskStorageKey(''),
      //storageKeyBase: StorageKeyParser.parse(config.plannerStorage),
      onlyConsumer: config.plannerOnlyConsumer,
      debug: config.plannerDebug,
      inspectorFactory: devtoolsPlannerInspectorFactory
    };
    this._suggestionsChanged(null, []);
    const planificator = await Planificator.create(arc, options);
    // TODO(sjmiles): initialize listener with empty suggestions so it doesn't have to figure out
    // that we reset Planificator (Planificator does not notify if it generates no suggestions the first time).
    planificator.registerVisibleSuggestionsChangedCallback(
        suggestions => this._suggestionsChanged(planificator, suggestions));
    planificator.loadSuggestions && await planificator.loadSuggestions();
    window.planificator = planificator; // for debugging only
    return planificator;
  }
  _suggestionsChanged(planificator, suggestions) {
    // TODO(sjmiles): maybe have @mmandlis do this at planner, also note that
    // suggestion.versionByStore is available for validation against arc.getVersionByStore()
    suggestions.arcid = planificator ? planificator.arc.id.toString() : '';
    log('suggestionsChanged', suggestions.arcid);
    this.fire('suggestions', suggestions);
  }
}

customElements.define('web-planner', WebPlanner);
