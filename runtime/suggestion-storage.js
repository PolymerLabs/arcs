/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../platform/assert-web.js';
import {Manifest} from './manifest.js';
import {RecipeResolver} from './ts-build/recipe/recipe-resolver.js';
import {Schema} from './ts-build/schema.js';
import {Type} from './ts-build/type.js';

export class SuggestionStorage {
  constructor(arc, userid) {
    assert(arc, `Arc must not be null`);
    assert(arc._storageKey, `Arc must has a storage key`);
    assert(userid, `User id must not be null`);

    this._arc = arc;
    let storageKeyTokens = this._arc._storageKey.split('/');
    this._arcKey = storageKeyTokens.slice(-1)[0];
    this._storageKey = 
      `${storageKeyTokens.slice(0, -2).join('/')}/users/${userid}/suggestions/${this._arcKey}`;

    this._recipeResolver = new RecipeResolver(this._arc);
    this._suggestionsUpdatedCallbacks = [];

    this._storeCallback = () => this._onStoreUpdated();
    this._storePromise = this._initStore(`${userid}-suggestions`, this._storageKey, async (store) => {
      this._store = store;
      await this._onStoreUpdated();
      this._store.on('change', this._storeCallback, this);
    });

    // Fallback to 'launcher' suggestions, if the arc is empty.
    // TODO: consider alternative solutions, e.g (1) store empty serialization for the new arc or
    // (2) monitor arc existence under /users/userid/arcs/.
    if (this._arcKey != 'launcher' && this._arc.activeRecipe.particles.length == 0 && this._arc._stores.length == 0) {
      this._initStore(
          `${userid}-launchersuggestions`,
          this._storageKey.replace(this._arcKey, 'launcher'),
          async (store) => await this._onStoreUpdated(store));
    }
  }

  _initStore(id, storageKey, callback) {
    let schema = new Schema({names: ['Suggestions'], fields: {current: 'Object'}});
    let type = Type.newEntity(schema);
    const promise = this._arc._storageProviderFactory._storageForKey(storageKey)._join(
        id, type, storageKey, /* shoudExist= */ 'unknown', /* referenceMode= */ false);
    promise.then(
      async (store) => await callback(store),
      (e) => console.error(`Failed to initialize suggestions store '${storageKey}' with error: ${e}`));
    return promise;
  }

  get storageKey() { return this._storageKey; }
  get store() { return this._store; }

  async ensureInitialized() {
    await this._storePromise;
    assert(this._store, `Store couldn't be initialized`);
  }

  async _onStoreUpdated(store) {
    if (this._suggestionsUpdatedCallbacks.length == 0) {
      // Suggestion store was updated, but there are no callback listening
      // to the updates - do nothing.
      return;
    }

    let value = (await (store || this._store).get()) || {};
    if (!value.current) {
      return;
    }

    let plans = [];
    for (let {descriptionText, recipe, hash, rank, suggestionContent} of value.current.plans) {
      try {
        plans.push({
          plan: await this._planFromString(recipe),
          descriptionText,
          recipe,
          hash,
          rank,
          suggestionContent
        });
      } catch (e) {
        console.error(`Failed to parse plan ${e}.`);
      }
    }
    console.log(`Suggestions store was updated, ${plans.length} suggestions fetched.`);
    this._suggestionsUpdatedCallbacks.forEach(callback => callback({plans}));
  }

  dispose() {
    if (this._store) {
      this._store.off('change', this._storeCallback);
      this._store = null;
    }
    this._storePromise = null;
    this._suggestionsUpdatedCallbacks = [];
  }

  registerSuggestionsUpdatedCallback(callback) {
    this._suggestionsUpdatedCallbacks.push(callback);
  }

  async _planFromString(planString) {
    let manifest = await Manifest.parse(
        planString, {loader: this._arc.loader, context: this._arc._context, fileName: ''});
    assert(manifest._recipes.length == 1);
    let plan = manifest._recipes[0];
    assert(plan.normalize(), `can't normalize deserialized suggestion: ${plan.toString()}`);
    if (!plan.isResolved()) {
      let resolvedPlan = await this._recipeResolver.resolve(plan);
      assert(resolvedPlan, `can't resolve plan: ${plan.toString({showUnresolved: true})}`);
      if (resolvedPlan) {
        plan = resolvedPlan;
      }
    }
    for (let store of manifest.stores) {
      // If recipe has hosted particles, manifest will have stores with hosted
      // particle specs. Moving these stores into the current arc's context.
      // TODO: This is a hack, find a proper way of doing this.
      this._arc._context._addStore(store);
    }
    return plan;
  }

  async storeCurrent(current) {
    await this.ensureInitialized();

    let plans = [];
    for (let plan of current.plans) {
      plans.push({
        recipe: this._planToString(plan.plan),
        hash: plan.hash,
        rank: plan.rank,
        descriptionText: plan.descriptionText,
        suggestionContent: {template: plan.descriptionText, model: {}}
      });
    }

    await this._updateStore({current: {plans}});
  }

  _planToString(plan) {
    // Special handling is only needed for plans (1) with hosted particles or
    // (2) local slot (ie missing slot IDs).
    if (!plan.handles.some(h => h.id && h.id.includes('particle-literal')) &&
        plan.slots.every(slot => Boolean(slot.id))) {
      return plan.toString();
    }

    // TODO: This is a transformation particle hack for plans resolved by
    // FindHostedParticle strategy. Find a proper way to do this.
    // Update hosted particle handles and connections.
    let planClone = plan.clone();
    planClone.slots.forEach(slot => slot.id = slot.id || `slotid-${this._arc.generateID()}`);

    let hostedParticleSpecs = [];
    for (let i = 0; i < planClone.handles.length; ++i) {
      let handle = planClone.handles[i];
      if (handle.id && handle.id.includes('particle-literal')) {
        let hostedParticleName = handle.id.substr(handle.id.lastIndexOf(':') + 1);
        // Add particle spec to the list.
        let hostedParticleSpec = this._arc._context.findParticleByName(hostedParticleName);
        assert(hostedParticleSpec, `Cannot find spec for particle '${hostedParticleName}'.`);
        hostedParticleSpecs.push(hostedParticleSpec.toString());

        // Override handle conenctions with particle name as local name.
        Object.values(handle.connections).forEach(conn => {
          assert(conn.type.isInterface);
          conn._handle = {localName: hostedParticleName};
        });

        // Remove the handle.
        planClone.handles.splice(i, 1);
        --i;
      }
    }

    return `${hostedParticleSpecs.join('\n')}\n${planClone.toString()}`;
  }

  async _updateStore(value) {
    await this.ensureInitialized();
    try {
      await this._store.set(value);
    } catch (e) {
      // debugger;
      console.error(e);
    }
  }
}
