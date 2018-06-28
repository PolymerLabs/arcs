/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from './loader.js';
import {Manifest} from './manifest.js';
import {Arc} from './arc.js';
import {SlotComposer} from './slot-composer.js';
import {Strategizer, Strategy} from '../strategizer/strategizer.js';
import {StrategyExplorerAdapter} from './debug/strategy-explorer-adapter.js';
import {Tracing} from '../tracelib/trace.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import {CreateHandleGroup} from './strategies/create-handle-group.js';
import {AddUseHandles} from './strategies/add-use-handles.js';
import * as Rulesets from './strategies/rulesets.js';
import {DevtoolsConnection} from './debug/devtools-connection.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {Handle} from './recipe/handle.js';

class RelevantContextRecipes extends Strategy {
  constructor(context, affordance) {
    super();
    this._recipes = [];
    for (let recipe of context.recipes) {
      if (affordance && recipe.particles.find(p => p.spec && !p.spec.matchAffordance(affordance)) !== undefined) {
        continue;
      }

      recipe = recipe.clone();
      let options = {errors: new Map()};
      if (recipe.normalize(options)) {
        this._recipes.push(recipe);
      } else {
        console.warn(`could not normalize a context recipe: ${[...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      }
    }
  }

  async generate({generation}) {
    if (generation != 0) {
      return [];
    }

    return this._recipes.map(recipe => ({
      result: recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe),
    }));
  }
}

const IndexStrategies = [
  ConvertConstraintsToConnections,
  AddUseHandles,
  ResolveRecipe,
  // This one is not in-line with 'transparent' interfaces, but it operates on
  // recipes without looking at the context and cannot run after AddUseHandles.
  // We will revisit this list when we take a stab at recipe interfaces.
  CreateHandleGroup
];

export class RecipeIndex {
  constructor(context, affordance) {
    let trace = Tracing.start({cat: 'indexing', name: 'RecipeIndex::constructor', overview: true});
    let arcStub = new Arc({
      id: 'index-stub',
      context: new Manifest({id: 'empty-context'}),
      slotComposer: affordance ? new SlotComposer({affordance, noRoot: true}) : null,
      recipeIndex: {},
    });
    let strategizer = new Strategizer(
      [
        new RelevantContextRecipes(context, affordance),
        ...IndexStrategies.map(S => new S(arcStub))
      ],
      [],
      Rulesets.Empty
    );
    this.ready = trace.endWith(new Promise(async resolve => {
      let generations = [];

      do {
        let record = await strategizer.generate();
        generations.push({record, generated: strategizer.generated});
      } while (strategizer.generated.length + strategizer.terminal.length > 0);

      if (DevtoolsConnection.isConnected) {
        StrategyExplorerAdapter.processGenerations(
            generations, DevtoolsConnection.get(), {label: 'Index', keep: true});
      }

      let population = strategizer.population;
      let candidates = new Set(population);
      for (let result of population) {
        for (let deriv of result.derivation) {
          if (deriv.parent) candidates.delete(deriv.parent);
        }
      }
      this._recipes = [...candidates].map(r => r.result);
      this._isReady = true;
      resolve(true);
    }));
  }

  get recipes() {
    if (!this._isReady) throw Error('await on recipeIndex.ready before accessing');
    return this._recipes;
  }

  // Given provided handle and requested fates, finds handles with
  // matching type and requested fate.
  findHandleMatch(handle, requestedFates) {
    if (!this._isReady) throw Error('await on recipeIndex.ready before accessing');

    let counts = RecipeUtil.directionCounts(handle);
    let particleNames = handle.connections.map(conn => conn.particle.name);

    let results = [];
    for (let recipe of this._recipes) {
      for (let otherHandle of recipe.handles) {
        if (!requestedFates.includes(otherHandle.fate)
            || otherHandle.connections.length === 0
            || otherHandle.name === 'descriptions') continue;
        let otherCounts = RecipeUtil.directionCounts(otherHandle);
        let otherParticleNames = otherHandle.connections.map(conn => conn.particle.name);

        if (otherCounts.in + counts.in === 0 // Someone has to read.
            || otherCounts.out + counts.out === 0 // Someone has to write.
            // If we're connecting the same sets of particles, that's probably not OK.
            // This is a poor workaround for connecting the exact same recipes together :(
            || new Set([...particleNames, ...otherParticleNames]).size
                === particleNames.length
            || !Handle.effectiveType(handle._mappedType,
                [...handle.connections, ...otherHandle.connections])) continue;

        results.push(otherHandle);
      }
    }

    return results;
  }
}
