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
import {Strategizer} from '../strategizer/strategizer.js';
import {StrategyExplorerAdapter} from './debug/strategy-explorer-adapter.js';
import {Tracing} from '../tracelib/trace.js';
import {ConvertConstraintsToConnections} from './strategies/convert-constraints-to-connections.js';
import {ResolveRecipe} from './strategies/resolve-recipe.js';
import {InitPopulation} from './strategies/init-population.js';
import {AddUseHandles} from './strategies/add-use-handles.js';
import * as Rulesets from './strategies/rulesets.js';
import {DevtoolsConnection} from './debug/devtools-connection.js';
import {RecipeUtil} from './recipe/recipe-util.js';
import {Handle} from './recipe/handle.js';

const IndexStrategies = [
  InitPopulation,
  ConvertConstraintsToConnections,
  AddUseHandles,
  ResolveRecipe,
];

export class RecipeIndex {
  constructor(context) {
    let trace = Tracing.start({cat: 'indexing', name: 'RecipeIndex::constructor', overview: true});
    let arcStub = new Arc({
      id: 'index-stub',
      slotComposer: new SlotComposer({affordance: 'mock', noRoot: true}),
      context,
      recipeIndex: {
        findHandleMatch: () => []
      },
    });
    let strategizer = new Strategizer(
        IndexStrategies.map(S => new S(arcStub)), [], Rulesets.Empty);
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
