/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

//import {Const} from '../configuration/constants.js';
//import {SyntheticStores} from './synthetic-stores.js';
import {ArcHost} from '../lib/arc-host.js';
import {logFactory} from '../lib/log-factory.js';
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
  onArc({add, remove}) {
    //log(add, remove);
    if (add) {
      this.addArc(add.id);
    }
    if (remove) {
      this.removeArc(remove.id);
    }
  }
  async addArc(key) {
    if (this.runners[key]) {
      warn(`marshalArc: already marshaled [${key}]`);
      return;
    }
    this.runners[key] = true;
    // TODO(sjmiles): we'll need a queue to handle change notifications that arrive while we are 'await'ing
    log(`marshalArc [${key}]`);
    try {
      const arc = await this.host.spawn({id: key});
      const planificator = await this.createPlanificator(this.userid, key, arc);
      this.runners[key] = {arc, planificator};
    } catch (x) {
      warn(`marshalArc [${key}] failed: `, x);
      //
    }
  }
  removeArc(key) {
    const runner = this.runners[key];
    if (runner) {
      runner.arc && runner.arc.dispose();
      this.runners[key] = null;
    }
  }
  async createPlanificator(userid, key, arc) {
    log(`createPlanificator for [${key}]`);
    const options = {
      //storageKeyBase: config.plannerStorage,
      //onlyConsumer: config.plannerOnlyConsumer,
      //debug: config.plannerDebug,
      userid
    };
    const planificator = await Planificator.create(arc, options);
    planificator.setSearch('*');
    //planificator.registerSuggestionsChangedCallback(current => this._plansChanged(current, planificator.getLastActivatedPlan()));
    planificator.registerVisibleSuggestionsChangedCallback(suggestions => this.suggestionsChanged(key, suggestions));
    return planificator;
  }
  suggestionsChanged(key, suggestions) {
    log(`suggestions [${key}]:`);
    suggestions.forEach(({descriptionByModality, plan: {_name}}) => log(`\t\t[${_name}]: ${descriptionByModality.text}`));
  }
}
