/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Firebase} from '../configuration/firebase-config.js';

// TODO(sjmiles): note that firebase agents must be instantiated elsewhere

export class ArcHost {
  constructor(env, context, storage, composer) {
    Firebase.configure(env.lib.firebase);
    this.env = env;
    this.context = context;
    this.storage = storage;
    this.composer = composer;
  }
  async spawn(config) {
    this.config = config;
    const context = this.context || await this.env.parse(``);
    const serialization = await this.computeSerialization(config, this.storage);
    this.arc = await this._spawn(this.env, context, this.composer, this.storage, config.id, serialization);
    if (config.manifest && !serialization) {
      await this.instantiateDefaultRecipe(this.env, this.arc, config.manifest);
    }
    return this.arc;
  }
  set manifest(manifest) {
    this.instantiateDefaultRecipe(this.env, this.arc, manifest);
  }
  dispose() {
    this.arc  && this.arc.dispose();
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
    storage = `${storage}/${id}`;
    return await env.spawn({id, context, composer, serialization, storage});
  }
  async instantiateDefaultRecipe(env, arc, manifest) {
    console.log('instantiateDefaultRecipe');
    try {
      manifest = await env.parse(manifest);
    } catch (x) {
      console.error(x);
    }
    const recipe = manifest.recipes[0];
    const plan = await env.resolve(arc, recipe);
    if (plan) {
      console.log('instantiating plan');
      try {
        await arc.instantiate(plan);
      } catch (x) {
        console.error(x);
        //console.error(plan.toString());
      }
      this.persistSerialization(); //arc);
      this.plan = plan;
    }
  }
  async persistSerialization() {
    const {arc, config: {id}, storage} = this;
    if (!storage.includes('volatile')) {
      console.log(`persisting serialization to [${id}/serialization]`);
      const serialization = await arc.serialize();
      //console.log(serialization);
      Firebase.db.child(`${id}/serialization`).set(serialization);
    }
  }
}
