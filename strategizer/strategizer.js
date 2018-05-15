// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';

export class Strategizer {
  constructor(strategies, evaluators, ruleset) {
    this._strategies = strategies;
    this._evaluators = evaluators;
    this._generation = 0;
    this._internalPopulation = [];
    this._population = [];
    this._generated = [];
    this._terminal = [];
    this._ruleset = ruleset;
    this.populationHash = new Map();
  }
  // Latest generation number.
  get generation() {
    return this._generation;
  }
  // All individuals in the current population.
  get population() {
    return this._population;
  }
  // Individuals of the latest generation.
  get generated() {
    return this._generated;
  }
  // Individuals from the previous generation that were not decended from in the
  // current generation.
  get terminal() {
    assert(this._terminal);
    return this._terminal;
  }
  async generate() {
    // Generate
    let generation = this.generation + 1;
    let generated = await Promise.all(this._strategies.map(strategy => {
      let recipeFilter = recipe => this._ruleset.isAllowed(strategy, recipe);
      return strategy.generate({
        generation: this.generation,
        generated: this.generated.filter(recipeFilter),
        terminal: this.terminal.filter(recipeFilter),
        population: this.population.filter(recipeFilter)
      });
    }));

    let record = {};
    record.generation = generation;
    record.sizeOfLastGeneration = this.generated.length;
    record.generatedDerivationsByStrategy = {};
    for (let i = 0; i < this._strategies.length; i++) {
      record.generatedDerivationsByStrategy[this._strategies[i].constructor.name] = generated[i].length;
    }

    generated = [].concat(...generated);

    // TODO: get rid of this additional asynchrony
    generated = await Promise.all(generated.map(async result => {
      if (result.hash) result.hash = await result.hash;
      return result;
    }));

    record.generatedDerivations = generated.length;
    record.nullDerivations = 0;
    record.invalidDerivations = 0;
    record.duplicateDerivations = 0;
    record.duplicateSameParentDerivations = 0;
    record.nullDerivationsByStrategy = {};
    record.invalidDerivationsByStrategy = {};
    record.duplicateDerivationsByStrategy = {};
    record.duplicateSameParentDerivationsByStrategy = {};

    generated = generated.filter(result => {
      let strategy = result.derivation[0].strategy.constructor.name;
      if (result.hash) {
        let existingResult = this.populationHash.get(result.hash);
        if (existingResult) {
          if (result.derivation[0].parent == existingResult) {
            record.nullDerivations += 1;
            if (record.nullDerivationsByStrategy[strategy] == undefined)
              record.nullDerivationsByStrategy[strategy] = 0;
            record.nullDerivationsByStrategy[strategy]++;
          } else if (existingResult.derivation.map(a => a.parent).indexOf(result.derivation[0].parent) != -1) {
            record.duplicateSameParentDerivations += 1;
            if (record.duplicateSameParentDerivationsByStrategy[strategy] == undefined)
              record.duplicateSameParentDerivationsByStrategy[strategy] = 0;
            record.duplicateSameParentDerivationsByStrategy[strategy]++;
          } else {
            record.duplicateDerivations += 1;
            if (record.duplicateDerivationsByStrategy[strategy] == undefined)
              record.duplicateDerivationsByStrategy[strategy] = 0;
            record.duplicateDerivationsByStrategy[strategy]++;
            this.populationHash.get(result.hash).derivation.push(result.derivation[0]);
          }
          return false;
        }
        this.populationHash.set(result.hash, result);
      }
      if (result.valid === false) {
        record.invalidDerivations++;
        record.invalidDerivationsByStrategy[strategy] = (record.invalidDerivationsByStrategy[strategy] || 0) + 1;
        return false;
      }
      return true;
    });

    let terminal = new Map();
    for (let candidate of this.generated) {
      terminal.set(candidate.result, candidate);
    }
    // TODO(piotrs): This is inefficient, improve at some point.
    for (let result of this.populationHash.values()) {
      for (let {parent} of result.derivation) {
        if (parent && terminal.has(parent.result)) {
          terminal.delete(parent.result);
        }
      }
    }
    terminal = [...terminal.values()];

    record.survivingDerivations = generated.length;

    generated.sort((a, b) => {
      if (a.score > b.score)
        return -1;
      if (a.score < b.score)
        return 1;
      return 0;
    });

    // Evalute
    let evaluations = await Promise.all(this._evaluators.map(strategy => {
      return strategy.evaluate(this, generated);
    }));
    let fitness = Strategizer._mergeEvaluations(evaluations, generated);

    assert(fitness.length == generated.length);
    for (let i = 0; i < fitness.length; i++) {
      this._internalPopulation.push({
        fitness: fitness[i],
        individual: generated[i],
      });
    }

    // TODO: Instead of push+sort, merge `internalPopulation` with `generated`.
    this._internalPopulation.sort((x, y) => y.fitness - x.fitness);

    // Publish
    this._terminal = terminal;
    this._generation = generation;
    this._generated = generated;
    this._population = this._internalPopulation.map(x => x.individual);

    return record;
  }

  static _mergeEvaluations(evaluations, generated) {
    let n = generated.length;
    let mergedEvaluations = [];
    for (let i = 0; i < n; i++) {
      let merged = NaN;
      for (let evaluation of evaluations) {
        let fitness = evaluation[i];
        if (isNaN(fitness)) {
          continue;
        }
        if (isNaN(merged)) {
          merged = fitness;
        } else {
          // TODO: how should evaluations be combined?
          merged = (merged * i + fitness) / (i + 1);
        }
      }
      if (isNaN(merged)) {
        // TODO: What should happen when there was no evaluation?
        merged = 0.5;
      }
      mergedEvaluations.push(merged);
    }
    return mergedEvaluations;
  }

  static over(results, walker, strategy) {
    walker.onStrategy(strategy);
    results.forEach(result => {
      walker.onResult(result);
      walker.onResultDone();
    });
    walker.onStrategyDone();
    return walker.descendants;
  }
}

class Walker {
  constructor() {
    this.descendants = [];
  }

  onStrategy(strategy) {
    this.currentStrategy = strategy;
  }

  onResult(result) {
    this.currentResult = result;
  }

  createDescendant(result, score, hash, valid) {
    assert(this.currentResult, 'no current result');
    assert(this.currentStrategy, 'no current strategy');
    if (this.currentResult.score)
      score += this.currentResult.score;
    this.descendants.push({
      result,
      score,
      derivation: [{parent: this.currentResult, strategy: this.currentStrategy}],
      hash,
      valid,
    });
  }

  onResultDone() {
    this.currentResult = undefined;
  }

  onStrategyDone() {
    this.currentStrategy = undefined;
  }
}

Strategizer.Walker = Walker;

// TODO: Doc call convention, incl strategies are stateful.
export class Strategy {
  async activate(strategizer) {
    // Returns estimated ability to generate/evaluate.
    // TODO: What do these numbers mean? Some sort of indication of the accuracy of the
    // generated individuals and evaluations.
    return {generate: 0, evaluate: 0};
  }
  getResults(inputParams) {
    return inputParams.generated;
  }
  async generate(inputParams) {
    return [];
  }
  async evaluate(strategizer, individuals) {
    return individuals.map(() => NaN);
  }
}

export class Ruleset {
  constructor(orderingRules) {
    this._orderingRules = orderingRules;
  }

  isAllowed(strategy, recipe) {
    let forbiddenAncestors = this._orderingRules.get(strategy.constructor);
    if (!forbiddenAncestors) return true;
    // TODO: This can be sped up with AND-ing bitsets of derivation strategies and forbiddenAncestors.
    return !recipe.derivation.some(d => forbiddenAncestors.has(d.strategy.constructor));
  }
}

Ruleset.Builder = class {
  constructor() {
    // Strategy -> [Strategy*]
    this._orderingRules = new Map();
  }

  /**
   * When invoked for strategies (A, B), ensures that B will never follow A in
   * the chain of derivations of all generated recipes.
   *
   * Following sequences are therefore valid: A, B, AB, AAABB, AC, DBC, CADCBCBD
   * Following sequences are therefore invalid: BA, ABA, BCA, DBCA
   *
   * Transitive closure of the ordering is computed.
   * I.e. For orderings (A, B) and (B, C), the ordering (A, C) is implied.
   *
   * Method can be called with multiple strategies at once.
   * E.g. (A, B, C) implies (A, B), (B, C) and transitively (A, C).
   *
   * Method can be called with arrays of strategies, which represent groups.
   * The ordering in the group is not enforced, but the ordering between them is.
   * E.g. ([A, B], [C, D], E) is a shorthand for:
   * (A, C), (A, D), (B, C), (B, D), (C, E), (D, E).
   */
  order(...strategiesOrGroups) {
    for (let i = 0; i < strategiesOrGroups.length - 1; i++) {
      let current = strategiesOrGroups[i], next = strategiesOrGroups[i + 1];
      for (let strategy of Array.isArray(current) ? current : [current]) {
        let set = this._orderingRules.get(strategy);
        if (!set) {
          this._orderingRules.set(strategy, set = new Set());
        }
        for (let nextStrategy of Array.isArray(next) ? next : [next]) {
          set.add(nextStrategy);
        }
      }
    }
    return this;
  }

  build() {
    // Making the ordering transitive.
    let beingExpanded = new Set();
    let alreadyExpanded = new Set();
    for (let strategy of this._orderingRules.keys()) {
      this._transitiveClosureFor(strategy, beingExpanded, alreadyExpanded);
    }
    return new Ruleset(this._orderingRules);
  }

  _transitiveClosureFor(strategy, beingExpanded, alreadyExpanded) {
    assert(!beingExpanded.has(strategy), 'Detected a loop in the ordering rules');

    let followingStrategies = this._orderingRules.get(strategy);
    if (alreadyExpanded.has(strategy)) return followingStrategies || [];

    if (followingStrategies) {
      beingExpanded.add(strategy);
      for (let following of followingStrategies) {
        for (let expanded of this._transitiveClosureFor(
            following, beingExpanded, alreadyExpanded)) {
          followingStrategies.add(expanded);
        }
      }
      beingExpanded.delete(strategy);
    }
    alreadyExpanded.add(strategy);

    return followingStrategies || [];
  }
};
