/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {SyntheticStores} from './synthetic-stores.js';
import {ArcType} from './arcs.js';
import {logFactory} from './arcs.js';
import {Suggestion} from './arcs.js';
import {Utils} from './utils.js';

const log = logFactory('ArcHost', '#cade57');
const warn = logFactory('ArcHost', '#cade57', 'warn');
const error = logFactory('ArcHost', '#cade57', 'error');

export class ArcHost {
  constructor(context, storage, composer) {
    this.context = context;
    this.storage = storage;
    this.composer = composer;
  }
  disposeArc() {
    this.arc && this.arc.dispose();
    this.arc = null;
  }
  // config = {id, [serialization], [manifest]}
  async spawn(config) {
    log('spawning arc', config);
    this.config = config;
    const context = this.context || await Utils.parse(``);
    const serialization = this.serialization = await this.computeSerialization(config, this.storage);
    this.arc = await this._spawn(context, this.composer, this.storage, config.id, serialization);
    if (config.manifest && !serialization) {
      await this.instantiateDefaultRecipe(this.arc, config.manifest);
    }
    if (this.pendingPlan) {
      const plan = this.pendingPlan;
      this.pendingPlan = null;
      await this.instantiatePlan(this.arc, plan);
    }
    return this.arc;
  }
  set manifest(manifest) {
    this.instantiateDefaultRecipe(this.arc, manifest);
  }
  set plan(plan) {
    if (this.arc) {
      this.instantiatePlan(this.arc, plan);
    } else {
      this.pendingPlan = plan;
    }
  }
  async computeSerialization(config, storage) {
    let serialization;
    if (config.serialization != null) {
      serialization = config.serialization;
    }
    if (serialization == null) {
      if (storage.includes('volatile')) {
        serialization = '';
      } else {
        serialization = await this.fetchSerialization(storage, config.id) || '';
      }
    }
    return serialization;
  }
  async _spawn(context, composer, storage, id, serialization) {
    return await Utils.spawn({id, context, composer, serialization, storage: `${storage}/${id}`});
  }
  async instantiateDefaultRecipe(arc, manifest) {
    log('instantiateDefaultRecipe');
    try {
      manifest = await Utils.parse(manifest);
      const recipe = manifest.allRecipes[0];
      const plan = await Utils.resolve(arc, recipe);
      if (plan) {
        this.instantiatePlan(arc, plan);
      }
    } catch (x) {
      error(x);
    }
  }
  async instantiatePlan(arc, plan) {
    log('instantiatePlan');
    // TODO(sjmiles): pass suggestion all the way from web-shell
    // and call suggestion.instantiate(arc).
    if (!plan.isResolved()) {
      log(`Suggestion plan ${plan.toString({showUnresolved: true})} is not resolved.`);
    }
    try {
      await arc.instantiate(plan);
    } catch (x) {
      error(x);
      //console.error(plan.toString());
    }
    await this.persistSerialization();
  }
  async fetchSerialization(storage, arcid) {
    const key = `${storage}/${arcid}/arc-info`;
    const store = await SyntheticStores.providerFactory.connect('id', new ArcType(), key);
    if (store) {
      const info = await store.get();
      return info && info.serialization;
    }
  }
  async persistSerialization() {
    const {arc, config: {id}, storage} = this;
    if (!storage.includes('volatile')) {
      log(`persisting serialization to [${id}/serialization]`);
      const serialization = await arc.serialize();
      await arc.persistSerialization(serialization);
    }
  }
}
