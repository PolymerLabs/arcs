/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Xen} from '../../lib/xen.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {Arcs} from '../../lib/web/runtime.js';
import {Firebase} from '../../configuration/firebase-config.js';

Firebase.configure(Arcs.firebase);

const log = Xen.logFactory('ArcHost', '#DDB815');

export class ArcHost extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'context', 'storage', 'config'];
  }
  async update(props, state) {
    const {env, context, config, storage} = props;
    if (config !== state.config) {
      state.config = config;
      if (state.arc) {
        this.teardownArc(state.arc);
      }
    }
    if (config) {
      if (env && !state.context) {
        this.awaitState('context', () => context || env.parse(``));
      }
      if (!state.composer) {
        this.state = {composer: this.createComposer(config)};
      }
      if (config.id && storage && state.serialization == null) {
        //this.state = {id: config.id};
        this.updateSerialization(props, state);
      }
      if (!state.arc && state.context && state.composer && config.id && state.serialization != null) {
        this.awaitState('arc', () => this.spawnArc(props, state));
      }
      if (env && config.manifest && state.arc) {
        if (state.manifest !== config.manifest && !state.serialization) {
          this.state = {manifest: config.manifest};
          this.instantiateDefaultRecipe(env, state.arc, config.manifest);
        }
      }
      if (config.id && state.outputSerialization) {
        this.writeOutputSerialization(config.id, state.outputSerialization);
        this.state = {outputSerialization: null};
      }
    }
  }
  createComposer({composer}) {
    composer = composer || {kind: SlotComposer, container: document.body, affordance: 'dom'};
    return new (composer.kind)({
      rootContainer: composer.container,
      affordance: composer.affordance || 'dom'
    });
  }
  updateSerialization({config, storage}, state) {
    if (config.serialization != null) {
      state.serialization = config.serialization;
    }
    if (state.serialization == null) {
      if (storage.includes('volatile')) {
        state.serialization = '';
      }
      else {
        this.awaitState('serialization', async () =>
          // TODO(sjmiles): stopgap: assumes firebase storage
          (await Firebase.db.child(`${config.id}/serialization`).once('value')).val() || '');
      }
    }
  }
  async spawnArc({env, config, storage}, {context, composer, serialization}) {
    const arc = await env.spawn({id: config.id, context, composer, serialization, storage: `${storage}/${config.id}`});
    this._fire('arc', arc);
    return arc;
  }
  async instantiateDefaultRecipe(env, arc, manifestText) {
    const manifest = await env.parse(manifestText);
    const recipe = manifest.recipes[0];
    const plan = await env.resolve(recipe);
    if (plan) {
      await arc.instantiate(plan);
      this._fire('recipe', plan);
      this.updateOutputSerialization(arc);
    }
  }
  async updateOutputSerialization(arc) {
    this.awaitState('outputSerialization', async () => await arc.serialize());
  }
  async writeOutputSerialization(arcid, serialization) {
    Firebase.db.child(`${String(arcid)}/serialization`).set(serialization);
  }
  teardownArc(arc) {
    // flush arc
    arc.dispose();
    // clean up arc relative state
    this.state = {/*id: null, */arc: null, serialization: null, manifest: null, composer: null};
    // notify owner
    this._fire('arc', null);
  }
}

customElements.define('arc-host', ArcHost);
