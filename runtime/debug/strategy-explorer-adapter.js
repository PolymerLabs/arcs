/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import devtoolsChannelProvider from './devtools-channel-provider.js';

export default class StrategyExplorerAdapter {
  static processGenerations(generations) {
    devtoolsChannelProvider.get().send({
      messageType: 'generations',
      // TODO: Implement simple serialization and move the logic in adapt()
      //       into the Strategy Explorer proper.
      messageBody: new StrategyExplorerAdapter().adapt(generations)
    });
  }
  constructor() {
    this.parentMap = new Map();
    this.lastID = 0;
  }
  adapt(generations) {
    return generations.map(pop => this._preparePopulation(pop.generated, pop.record));
  }
  _preparePopulation(population, record) {
    // Adding those here to reuse recipe resolution computation.
    record.resolvedDerivations = 0;
    record.resolvedDerivationsByStrategy = {};

    // Hidden predecessors are listed in recipe derivation, but not in the
    // population itself. They currently come from the CombinedStrategy. We want
    // to surface them in the StrategyExplorer for transparency.
    let hiddenPredecessorsCandidates = [];
    const addHiddenPredecessorsCandidates = ({parent}) => {
      if (!parent || this.parentMap.has(parent)) return;
      hiddenPredecessorsCandidates.push(parent);
      parent.derivation.forEach(addHiddenPredecessorsCandidates);
    };
    const assignIdAndCopy = recipe => {
      this.parentMap.set(recipe, this.lastID);
      let {result, score, derivation, description, hash, valid, active, irrelevant} = recipe;
      return {result, score, derivation, description, hash, valid, active, irrelevant, id: this.lastID++};
    };
    population = population.map(recipe => {
      recipe.derivation.forEach(addHiddenPredecessorsCandidates);
      return assignIdAndCopy(recipe);
    });
    // As a recipe might have regular predecessors in the current generation,
    // the check for presence in the parentMap needs to re-evaluated after
    // processing entire population to avoid false positives.
    for (let predecessor of hiddenPredecessorsCandidates) {
      if (!this.parentMap.has(predecessor)) {
        population.push(Object.assign(assignIdAndCopy(predecessor), {combined: true}));
      }
    }

    population.forEach(item => {
      item.derivation = item.derivation.map(derivItem => {
        let parent, strategy;
        if (derivItem.parent)
          parent = this.parentMap.get(derivItem.parent);
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
  }
}
