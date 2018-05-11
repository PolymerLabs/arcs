/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {getDevtoolsChannel} from './devtools-channel-provider.js';

export class StrategyExplorerAdapter {
  static processGenerations(generations) {
    getDevtoolsChannel().send({
      messageType: 'generations',
      // TODO: Implement simple serialization and move the logic in adapt()
      //       into the Strategy Explorer proper.
      messageBody: StrategyExplorerAdapter.adapt(generations)
    });
  }
  static adapt(generations) {
    const idMap = new Map(); // Recipe -> ID
    let lastID = 0;

    // Make a copy of everything and assign IDs to recipes.
    for (let pop of generations) {
      pop.generated = pop.generated.map(function assignIdAndCopy(recipe) {
        idMap.set(recipe, lastID);
        let {result, score, derivation, description, hash, valid, active, irrelevant} = recipe;
        return {result, score, derivation, description, hash, valid, active, irrelevant, id: lastID++};
      });
    }

    // CombinedStrategy creates recipes with derivations that are missing
    // from the population. Re-adding them as 'combined'.
    for (let pop of generations) {
      let lengthWithoutCombined = pop.generated.length;
      for (let i = 0; i < lengthWithoutCombined; i++) {
        pop.generated[i].derivation.forEach(function addMissing({parent}) {
          if (parent && !idMap.has(parent)) {
            pop.generated.push(Object.assign(assignIdAndCopy(parent), {combined: true}));
            parent.derivation.forEach(addMissing);
          }
        });
      }
    }

    return generations.map(pop => {
      let population = pop.generated;
      let record = pop.record;
      // Adding those here to reuse recipe resolution computation.
      record.resolvedDerivations = 0;
      record.resolvedDerivationsByStrategy = {};

      population.forEach(item => {
        // Change recipes in derivation to IDs.
        item.derivation = item.derivation.map(derivItem => {
          let parent, strategy;
          if (derivItem.parent)
            parent = idMap.get(derivItem.parent);
          if (derivItem.strategy)
            strategy = derivItem.strategy.constructor.name;
          return {parent, strategy};
        });
        item.resolved = item.result.isResolved();
        if (item.resolved) {
          record.resolvedDerivations++;
          let strategy = item.derivation[0].strategy;
          if (record.resolvedDerivationsByStrategy[strategy] === undefined)
            record.resolvedDerivationsByStrategy[strategy] = 0;
          record.resolvedDerivationsByStrategy[strategy]++;
        }
        let options = {showUnresolved: true, showInvalid: false, details: ''};
        item.result = item.result.toString(options);
      });
      let populationMap = {};
      population.forEach(item => {
        if (populationMap[item.derivation[0].strategy] == undefined)
          populationMap[item.derivation[0].strategy] = [];
        populationMap[item.derivation[0].strategy].push(item);
      });
      let result = {population: [], record};
      Object.keys(populationMap).forEach(strategy => {
        result.population.push({strategy: strategy, recipes: populationMap[strategy]});
      });
      return result;
    });
  }
}
