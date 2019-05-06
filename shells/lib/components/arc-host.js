/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ArcType} from '../../../build/runtime/type.js';
import {logsFactory} from '../../../build/platform/log-web.js';
import {SyntheticStores} from '../runtime/synthetic-stores.js';
import {Utils} from '../runtime/utils.js';

const {log, warn, error} = logsFactory('ArcHost', '#cade57');

export class ArcHost {
  constructor(context, storage, composer) {
    this.context = context;
    this.storage = storage;
    this.composer = composer;
  }
  disposeArc() {
    if (this.arc) {
      this.arc.dispose();
    }
    this.arc = null;
  }
  // config = {id, [serialization], [manifest]}
  async spawn(config) {
    log('spawning arc', config);
    this.config = config;
    const context = this.context || await Utils.parse(``);
    this.serialization = await this.computeSerialization(config, this.storage);
    this.arc = await this._spawn(context, this.composer, this.storage, config.id, this.serialization);
    if (config.manifest && !this.serialization) {
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
        await this.instantiatePlan(arc, plan);
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
    await this.persistSerialization(arc);
  }
  async fetchSerialization(storage, arcid) {
    const key = `${storage}/${arcid}/arc-info`;
    const store = await SyntheticStores.providerFactory.connect('id', new ArcType(), key);
    if (store) {
      log('loading stored serialization');
      const info = await store.get();
      return info && info.serialization;
    }
  }
  async persistSerialization(arc) {
    const {id, storageKey} = arc;
    //const {config: {id}, storage} = this;
    if (!storageKey.includes('volatile')) {
      log(`persisting serialization to [${id}/serialization]`);
      const serialization = await arc.serialize();
      await arc.persistSerialization(serialization);
    }
  }
}
