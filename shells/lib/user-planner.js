/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Const} from '../configuration/constants.js';
import {SyntheticStores} from './synthetic-stores.js';
import {ArcHost} from '../lib/arc-host.js';
// TODO(sjmiles): breaks cross-platform
import {logFactory} from '../../build/platform/log-node.js';
import {Planificator} from '../env/arcs.js';

const log = logFactory('UserPlanner', '#4f0433');
const warn = logFactory('UserPlanner', '#4f0433', 'warn');

export class UserPlanner {
  constructor(env, userid, context, storage, composer) {
    this.runners = [];
    this.env = env;
    this.userid = userid;
    this.createHost(env, context, storage, composer);
  }
  createHost(env, context, storage, composer) {
    this.host = new ArcHost(env, context, storage, composer);
    log('createHost', Boolean(this.host));
  }
  arcChanged(info) {
    if (info.add) {
      info.add.forEach(add => {
        //log('arcChanged[add]:\n', add.value);
        this.marshalArc(add.value.rawData.key);
      });
    }
    if (info.remove) {
      info.remove.forEach(remove => {
        //log('arcChanged[remove]:\n', remove.value);
        this.marshalArc(remove.value.rawData.key);
      });
    }
  }
  async marshalArc(key) {
    if (this.runners[key]) {
      console.warn(`marshalArc: already marshaled [${key}]`);
      return;
    }
    this.runners[key] = true;
    // TODO(sjmiles): we'll need a queue to handle change notifications that arrive while we are 'await'ing
    console.log(`marshalArc [${key}]`);
    try {
      const arc = await this.host.spawn({id: key});
      const planificator = await this.createPlanificator(this.userid, key, arc);
      this.runners[key] = {arc, planificator};
    } catch (x) {
      // console.log(==============================================');
      // console.log(serialization);
      // console.log('==============================================');
      throw x;
    }
  }
  disposeArc(key) {
    const runner = this.runners[key];
    if (runner) {
      runner.arc.dispose();
      this.runners[key] = null;
    }
  }
  async createPlanificator(userid, key, arc) {
    const options = {
      //storageKeyBase: config.plannerStorage,
      //onlyConsumer: config.plannerOnlyConsumer,
      //debug: config.plannerDebug,
      userid
    };
    const planificator = await Planificator.create(arc, options);
    planificator.registerSuggestionsChangedCallback(current => this._plansChanged(current, planificator.getLastActivatedPlan()));
    planificator.registerVisibleSuggestionsChangedCallback(suggestions => this._suggestionsChanged(suggestions));
    //planificator.loadSuggestions && await planificator.loadSuggestions();
    return planificator;
  }
}
