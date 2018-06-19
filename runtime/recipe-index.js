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

export class RecipeIndex {
  constructor(context) {
    let trace = Tracing.start({cat: 'index', name: 'RecipeIndex::constructor', overview: true});
    let arcStub = new Arc({
      id: 'index-stub',
      slotComposer: new SlotComposer({affordance: 'mock', noRoot: true}),
      context,
      recipeIndex: {
        recipes: []
      },
    });
    let strategizer = new Strategizer(
      [
        new InitPopulation(arcStub),
        ...[
          ConvertConstraintsToConnections,
          AddUseHandles,
          ResolveRecipe,
        ].map(s => new s(arcStub))
      ],
      [],
      Rulesets.Empty
    );
    this._recipes = trace.endWith(new Promise(async resolve => {
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
      resolve([...candidates].map(r => r.result));
    }));
  }
  get recipes() {
    return this._recipes;
  }
}
