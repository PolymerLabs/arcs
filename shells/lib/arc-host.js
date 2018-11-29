/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// TODO(sjmiles): note that firebase agents must be instantiated elsewhere
import {firebase} from '../env/arcs.js';
import {Firebase} from '../configuration/firebase-config.js';
import {logFactory} from './log-factory.js';

const log = logFactory('ArcHost', '#cade57');
const warn = logFactory('ArcHost', '#cade57', 'warn');
const error = logFactory('ArcHost', '#cade57', 'error');

const Schemas = {
  serialization: {
    tag: 'Entity',
    data: {
      names: ['Serialization'],
      fields: {
        'serialization': 'Text',
      }
    }
  }
};

export class ArcHost {
  constructor(env, context, storage, composer) {
    Firebase.configure(firebase);
    this.env = env;
    this.context = context;
    this.storage = storage;
    this.composer = composer;
  }
  disposeArc() {
    this.arc && this.arc.dispose();
    this.arc = null;
  }
  async spawn(config) {
    log('spawning arc', config);
    this.config = config;
    const context = this.context || await this.env.parse(``);
    const serialization = this.serialization = await this.computeSerialization(config, this.storage);
    this.arc = await this._spawn(this.env, context, this.composer, this.storage, config.id, serialization);
    //this.computeSerializationStore(serialization);
    if (config.manifest && !serialization) {
      await this.instantiateDefaultRecipe(this.env, this.arc, config.manifest);
    }
    if (this.pendingPlan) {
      const plan = this.pendingPlan;
      this.pendingPlan = null;
      this.instantiatePlan(this.arc, plan);
    }
    return this.arc;
  }
  set manifest(manifest) {
    this.instantiateDefaultRecipe(this.env, this.arc, manifest);
  }
  set plan(plan) {
    if (this.arc) {
      this.instantiatePlan(this.arc, plan);
    } else {
      this.pendingPlan = plan;
    }
  }
  async computeSerializationStore(serialization) {
    const type = this.env.lib.Type.fromLiteral(Schemas.serialization);
    const stores = await this.arc.findStoresByType(type);
    let store;
    if (stores.length) {
      store = stores[0];
      log('located serial store', store);
    } else {
      store = await this.arc.createStore(type, 'Serialization', 'SYSTEM_Serialization');
      log('created serial store', store);
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
      }
      else {
        // TODO(sjmiles): stopgap: assumes firebase storage
        const snap = await Firebase.db.child(`${config.id}/serialization`).once('value');
        serialization = snap.val() || '';
      }
    }
    return serialization;
  }
  async _spawn(env, context, composer, storage, id, serialization) {
    return await env.spawn({id, context, composer, serialization, storage: `${storage}/${id}`});
  }
  async instantiateDefaultRecipe(env, arc, manifest) {
    log('instantiateDefaultRecipe');
    try {
      manifest = await env.parse(manifest);
    } catch (x) {
      error(x);
    }
    const recipe = manifest.allRecipes[0];
    const plan = await env.resolve(arc, recipe);
    if (plan) {
      this.instantiatePlan(arc, plan);
    }
  }
  async instantiatePlan(arc, plan) {
    log('instantiatePlan');
    try {
      await arc.instantiate(plan);
    } catch (x) {
      error(x);
      //console.error(plan.toString());
    }
    this.persistSerialization(); //arc);
    //this.plan = plan;
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
