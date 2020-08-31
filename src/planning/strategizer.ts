/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Arc} from '../runtime/arc.js';
import {Recipe} from '../runtime/recipe/lib-recipe.js';
import {RecipeWalker} from '../runtime/recipe/lib-recipe.js';
import {WalkerTactic} from '../utils/walker.js';
import {Action, GenerateParams, Descendant} from '../utils/walker.js';
import {Dictionary} from '../utils/hot.js';

export interface GenerationRecord {
  generation: number;
  sizeOfLastGeneration: number;
  generatedDerivationsByStrategy: Dictionary<number>;
  generatedDerivations?: number;
  nullDerivations?: number;
  invalidDerivations?: number;
  duplicateDerivations?: number;
  duplicateSameParentDerivations?: number;
  nullDerivationsByStrategy?: Dictionary<number>;
  invalidDerivationsByStrategy?: Dictionary<number>;
  duplicateDerivationsByStrategy?: Dictionary<number>;
  duplicateSameParentDerivationsByStrategy?: Dictionary<number>;
  survivingDerivations?: number;
}

export class Strategizer {
  _strategies: Strategy[];
  _evaluators: Strategy[];
  _generation = 0;
  _internalPopulation: {fitness: number, individual: Descendant<Recipe>}[] = [];
  _population: Descendant<Recipe>[] = [];
  _generated: Descendant<Recipe>[] = [];
  _ruleset: Ruleset;
  _terminal: Descendant<Recipe>[] = [];
  populationHash: Map<string, Descendant<Recipe>>;

  constructor(strategies: Strategy[], evaluators: Strategy[], ruleset: Ruleset) {
    this._strategies = strategies;
    this._evaluators = evaluators;
    this._ruleset = ruleset;
    this.populationHash = new Map();
  }
  // Latest generation number.
  get generation(): number {
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

  /**
   * @return Individuals from the previous generation that were not descended from in the
   * current generation.
   */
  get terminal() {
    assert(this._terminal);
    return this._terminal;
  }

  async generate() {
    // Generate
    const generation = this.generation + 1;
    const generatedResults = await Promise.all(this._strategies.map(async strategy => {
      const recipeFilter = (recipe: Descendant<Recipe>) => this._ruleset.isAllowed(strategy, recipe);
      return strategy.generate({
        generation: this.generation,
        generated: this.generated.filter(recipeFilter),
        terminal: this.terminal.filter(recipeFilter),
        population: this.population.filter(recipeFilter)
      });
    }));

    const record : GenerationRecord = {
      generation,
      sizeOfLastGeneration: this.generated.length,
      generatedDerivationsByStrategy: {}
    };

    for (let i = 0; i < this._strategies.length; i++) {
      record.generatedDerivationsByStrategy[this._strategies[i].constructor.name] = generatedResults[i].length;
    }

    let generated: Descendant<Recipe>[] = ([] as Descendant<Recipe>[]).concat(...generatedResults);

    // TODO: get rid of this additional asynchrony
    generated = await Promise.all(generated.map(async result => {
      if (result.hash) {
        result.hash = await result.hash;
      }
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
      const strategy = result.derivation[0].strategy.constructor.name;
      if (result.hash) {
        const existingResult = this.populationHash.get(result.hash as string);
        if (existingResult) {
          if (result.derivation[0].parent === existingResult) {
            record.nullDerivations += 1;
            if (record.nullDerivationsByStrategy[strategy] == undefined) {
              record.nullDerivationsByStrategy[strategy] = 0;
            }
            record.nullDerivationsByStrategy[strategy]++;
          } else if (existingResult.derivation.map(a => a.parent).indexOf(result.derivation[0].parent) !== -1) {
            record.duplicateSameParentDerivations += 1;
            if (record.duplicateSameParentDerivationsByStrategy[strategy] ==
                undefined) {
              record.duplicateSameParentDerivationsByStrategy[strategy] = 0;
            }
            record.duplicateSameParentDerivationsByStrategy[strategy]++;
          } else {
            record.duplicateDerivations += 1;
            if (record.duplicateDerivationsByStrategy[strategy] == undefined) {
              record.duplicateDerivationsByStrategy[strategy] = 0;
            }
            record.duplicateDerivationsByStrategy[strategy]++;
            this.populationHash.get(result.hash as string).derivation.push(result.derivation[0]);
          }
          return false;
        }
        this.populationHash.set(result.hash as string, result);
      }
      if (result.valid === false) {
        record.invalidDerivations++;
        record.invalidDerivationsByStrategy[strategy] = (record.invalidDerivationsByStrategy[strategy] || 0) + 1;
        return false;
      }
      return true;
    });

    const terminalMap = new Map<Recipe, Descendant<Recipe>>();
    for (const candidate of this.generated) {
      terminalMap.set(candidate.result, candidate);
    }
    // TODO(piotrs): This is inefficient, improve at some point.
    for (const result of this.populationHash.values()) {
      for (const {parent} of result.derivation) {
        if (parent && terminalMap.has(parent.result)) {
          terminalMap.delete(parent.result);
        }
      }
    }
    const terminal = [...terminalMap.values()];

    record.survivingDerivations = generated.length;

    generated.sort((a, b) => {
      if (a.score > b.score) {
        return -1;
      }
      if (a.score < b.score) {
        return 1;
      }
      return 0;
    });

    const evaluations = await Promise.all(this._evaluators.map(async strategy => {
      return strategy.evaluate(this, generated);
    }));
    const fitness = Strategizer._mergeEvaluations(evaluations, generated);

    assert(fitness.length === generated.length);
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

  static _mergeEvaluations(evaluations: number[][], generated: Descendant<Recipe>[]): number[] {
    const n = generated.length;
    const mergedEvaluations: number[] = [];
    for (let i = 0; i < n; i++) {
      let merged = NaN;
      for (const evaluation of evaluations) {
        const fitness = evaluation[i];
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
}

export class StrategizerWalker extends RecipeWalker {
  constructor(tactic: WalkerTactic) {
    super(tactic);
  }

  createDescendant(recipe: Recipe, score: number): void {
    assert(this.currentAction instanceof Strategy, 'no current strategy');
    // Note that the currentAction assertion in the superclass method is now
    // guaranteed to succeed.
    super.createDescendant(recipe, score);
  }

  static over(results: Descendant<Recipe>[], walker: StrategizerWalker, strategy: Strategy): Descendant<Recipe>[] {
    return super.walk(results, walker, strategy);
  }
}

export type StrategyParams = GenerateParams<Recipe>;

// TODO: Doc call convention, incl strategies are stateful.
export abstract class Strategy extends Action<Recipe> {
  protected readonly arc: Arc;
  constructor(arc?: Arc, args?) {
    super(args);
    this.arc = arc;
  }

  async activate(strategizer: Strategizer) {
    // Returns estimated ability to generate/evaluate.
    // TODO: What do these numbers mean? Some sort of indication of the accuracy of the
    // generated individuals and evaluations.
    return {generate: 0, evaluate: 0};
  }

  async evaluate(strategizer: Strategizer, individuals: Descendant<Recipe>[]): Promise<number[]> {
    return individuals.map(() => NaN);
  }
}

// These types allow us to create lists of StrategyDerived classes and
// construct them while avoiding TS2511 "Cannot create an instance of an abstract type
type StrategyClass = typeof Strategy;
export interface StrategyDerived extends StrategyClass {}

export class RulesetBuilder {
  _orderingRules: Map<StrategyDerived, Set<StrategyDerived>>;

  constructor() {
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
  order(...strategiesOrGroups: (StrategyDerived | StrategyDerived[])[]) {
    for (let i = 0; i < strategiesOrGroups.length - 1; i++) {
      const current = strategiesOrGroups[i];
      const next = strategiesOrGroups[i + 1];
      for (const strategy of Array.isArray(current) ? current : [current]) {
        let set = this._orderingRules.get(strategy);
        if (!set) {
          this._orderingRules.set(strategy, set = new Set());
        }
        for (const nextStrategy of Array.isArray(next) ? next : [next]) {
          set.add(nextStrategy);
        }
      }
    }
    return this;
  }

  build(): Ruleset {
    // Making the ordering transitive.
    const beingExpanded = new Set<StrategyDerived>();
    const alreadyExpanded = new Set<StrategyDerived>();
    for (const strategy of this._orderingRules.keys()) {
      this._transitiveClosureFor(strategy, beingExpanded, alreadyExpanded);
    }
    return new Ruleset(this._orderingRules);
  }

  _transitiveClosureFor(strategy: StrategyDerived, beingExpanded: Set<StrategyDerived>, alreadyExpanded: Set<StrategyDerived>): Set<StrategyDerived> {
    assert(!beingExpanded.has(strategy), 'Detected a loop in the ordering rules');

    const followingStrategies = this._orderingRules.get(strategy);
    if (alreadyExpanded.has(strategy)) return followingStrategies || new Set();

    if (followingStrategies) {
      beingExpanded.add(strategy);
      for (const following of followingStrategies) {
        for (const expanded of this._transitiveClosureFor(
            following, beingExpanded, alreadyExpanded)) {
          followingStrategies.add(expanded);
        }
      }
      beingExpanded.delete(strategy);
    }
    alreadyExpanded.add(strategy);

    return followingStrategies || new Set();
  }
}

export class Ruleset {
  _orderingRules: Map<StrategyDerived, Set<StrategyDerived>>;

  constructor(orderingRules: Map<StrategyDerived, Set<StrategyDerived>>) {
    this._orderingRules = orderingRules;
  }

  isAllowed(strategy: Strategy, recipe: Descendant<Recipe>): boolean {
    const forbiddenAncestors = this._orderingRules.get(strategy.constructor as StrategyDerived);
    if (!forbiddenAncestors) return true;
    // TODO: This can be sped up with AND-ing bitsets of derivation strategies and forbiddenAncestors.
    return !recipe.derivation.some(d => forbiddenAncestors.has(d.strategy.constructor as StrategyDerived));
  }
  // tslint:disable-next-line: variable-name
  static Builder = RulesetBuilder;
}

