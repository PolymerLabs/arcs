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
    return generations.map(pop => this._preparePopulation(pop));
  }
  _addExtraPredecessor(parent, hash) {
    let extras = [];
    if (parent && !this.parentMap.has(parent)) {
      this.parentMap.set(parent, this.lastID);
      parent.derivation.forEach(d => extras = extras.concat(this._addExtraPredecessor(d.parent, hash)));
      extras.push({result: parent.result,
                   score: parent.score,
                   derivation: parent.derivation,
                   description: parent.description,
                   hash: hash,
                   valid: parent.valid,
                   active: parent.active,
                   combined: true,
                   id: this.lastID++});
    }
    return extras;
  }
  _preparePopulation(population) {
    let extras = [];
    population = population.map(recipe => {
      let {result, score, derivation, description, hash, valid, active} = recipe;
      recipe.derivation.forEach(d => extras = extras.concat(this._addExtraPredecessor(d.parent, hash)));
      this.parentMap.set(recipe, this.lastID);
      return {result, score, derivation, description, hash, valid, active, id: this.lastID++};
    });
    population = extras.concat(population);

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
      let options = {showUnresolved: true, showInvalid: false, details: ''};
      item.result = item.result.toString(options);
    });
    let populationMap = {};
    population.forEach(item => {
      if (populationMap[item.derivation[0].strategy] == undefined)
        populationMap[item.derivation[0].strategy] = [];
      populationMap[item.derivation[0].strategy].push(item);
    });
    let result = {population: []};
    Object.keys(populationMap).forEach(strategy => {
      result.population.push({strategy: strategy, recipes: populationMap[strategy]});
    });
    return result;
  }
}
