/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/platform/logs-factory.js';
import {devtoolsArcInspectorFactory} from '../../../build/devtools-connector/devtools-arc-inspector.js';

const {log, warn, error} = logsFactory('ArcHost', '#cade57');

export class ArcHost {
  constructor(runtime, storage, composer) {
    this.runtime = runtime;
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
    const storage = config.storage || this.storage;
    this.serialization = await this.computeSerialization(config, storage);
    // TODO(sjmiles): weird consequence of re-using composer, which we probably should not do anymore
    this.composer.arc = null;
    this.arc = await this._spawn(storage, config.id, this.serialization);
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
  async _spawn(storage, id, serialization, inspectorFactory) {
    return this.runtime.getArcById(serialization ?
      await this.runtime.allocator.deserialize({
        serialization,
        slotObserver: this.composer['slotObserver'],
        inspectorFactory: devtoolsArcInspectorFactory,
      }) :
      await this.runtime.allocator.newArc({
        arcName: id,
        storage: `${storage}/${id}`, // should be StorageKey instead
        slotObserver: this.composer['slotObserver'],
        inspectorFactory: devtoolsArcInspectorFactory
      })
    );
  }
  async instantiateDefaultRecipe(arc, manifest) {
    log('instantiateDefaultRecipe');
    try {
      manifest = await this.runtime.parse(manifest);
      const recipe = manifest.allRecipes[0];
      await this.instantiatePlan(arc, recipe);
    } catch (x) {
      error(x);
    }
  }
  async instantiatePlan(arc, plan) {
    log('instantiatePlan');
    // TODO(sjmiles): pass suggestion all the way from web-shell
    // and call suggestion.instantiate(arc).
    try {
      await this.runtime.allocator.runPlanInArc(arc.id, plan);
    } catch (x) {
      error(x);
      //console.error(plan.toString());
    }
    await this.persistSerialization(arc);
  }
  async fetchSerialization(storage, arcid) {
    return null;
    // const key = `${storage}/${arcid}/arc-info`;
    // const store = await SyntheticStores.providerFactory.connect('id', new ArcType(), key);
    // if (store) {
    //   log('loading stored serialization');
    //   const info = await store.get();
    //   return info && info.serialization;
    // }
  }
  async persistSerialization(arc) {
    // const {id, storageKey} = arc;
    // if (!storageKey.includes('volatile')) {
    //   log(`compiling serialization for [${id}]...`);
    //   const serialization = await arc.serialize();
    //   log(`persisting serialization to [${id}/serialization]...`);
    //   await arc.persistSerialization(serialization);
    // }
  }
}
