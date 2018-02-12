// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/* <link rel="import" href="se-arc-view.html"></link>
<link rel="import" href="se-explorer.html"></link>
<link rel="import" href="se-recipe-view.html"></link> */

const template = `

<style>
  #toplevel {
    display: flex;
  }
</style>
<div id='toplevel'>
  <se-explorer results='{{results}}'></se-explorer>
  <div>
    <se-recipe-view></se-recipe-view>
    <se-arc-view></se-arc-view>
  </div>
</div>

`;

class StrategyExplorer extends Xen.Base {
  _didMount() {
    document.strategyExplorer = this;
    this.reset();
  }
  reset() {
    this.set('results', []);
    this.parentMap = new Map();
    this.lastID = 0;
    this.idMap = new Map();
    this.pendingActions = new Map();
  }
  preparePopulation(population) {
    let extras = [];
    population = population.map(recipe => {
      let {result, score, derivation, description, hash, valid, active} = recipe;
      recipe.derivation.forEach(d => extras = extras.concat(this.addExtraPredecessor(d.parent, hash)));
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
      const strategy = item.derivation[0].strategy;
      if (populationMap[strategy] == undefined)
        populationMap[strategy] = [];
      populationMap[strategy].push(item);
    });
    let result = {population: []};
    Object.keys(populationMap).forEach(strategy => {
      result.population.push({strategy: strategy, recipes: populationMap[strategy]});
    });
    return result;
  }
  addExtraPredecessor(parent, hash) {
    let extras = [];
    if (parent && !this.parentMap.has(parent)) {
      parent.derivation.forEach(d => extras = extras.concat(this.addExtraPredecessor(d.parent, hash)));
      this.parentMap.set(parent, this.lastID);
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
}