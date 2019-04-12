// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../arc.js';

/**
 * Walkers traverse an object, calling methods based on the
 * features encountered on that object. For example, a RecipeWalker
 * takes a list of recipes and calls methods when:
 *  - a new recipe is encountered
 *  - a handle is found inside a recipe
 *  - a particle is found inside a recipe
 *  - etc..
 * 
 * Each of these methods can return a list of updates:
 *   [(recipe, encountered_thing) => new_recipe]
 *
 * The walker then does something with the updates depending on the
 * tactic selected.
 * 
 * If the tactic is "Permuted", then an output will be generated
 * for every combination of 1 element drawn from each update list.
 * For example, if 3 methods return [a,b], [c,d,e], and [f] respectively
 * then "Permuted" will cause 6 outputs to be generated: [acf, adf, aef, bcf, bdf, bef]
 * 
 * If the tactic is "Independent", an output will be generated for each
 * update, regardless of the list the update is in. For example,
 * if 3 methods return [a,b], [c,d,e], and [f] respectively,
 * then "Independent" will cause 6 outputs to be generated: [a,b,c,d,e,f]
 */

export enum WalkerTactic {Permuted='permuted', Independent='independent'}

interface Cloneable {
  clone(map: Map<object, object>): this;
}

export interface Descendant<T extends Cloneable> {
  result: T;
  score: number;
  derivation: {
    parent: Descendant<T>;
    strategy: Action<T>
  }[];
  hash: Promise<string> | string;
  valid: boolean;
  errors?;
  normalized?;
}

/**
 * An Action generates the list of Descendants by walking the object with a 
 * Walker.
 */
export abstract class Action<T extends Cloneable> {
  private readonly _arc?: Arc;
  private _args?;

  constructor(arc?: Arc, args?) {
    this._arc = arc;
    this._args = args;
  }

  get arc(): Arc | undefined {
    return this._arc;
  }

  getResults(inputParams: {generated: Descendant<T>[]}) {
    return inputParams.generated;
  }

  async generate(inputParams): Promise<Descendant<T>[]> {
    return [];
  }
}

// Exported alias to be used by visitor methods of walker subclasses.
export type Continuation<T extends Cloneable, Ctx extends object[]> = SingleContinuation<T, Ctx> | SingleContinuation<T, Ctx>[];

// Utility aliases used in the walker.
interface Update<T extends Cloneable, Ctx extends object[]> {
  continuation: Continuation<T, Ctx>;
  context: Ctx;
}
type SingleContinuation<T extends Cloneable, Ctx extends object[]> = (obj: T, ...ctx: Ctx) => number;
interface SingleUpdate<T extends Cloneable, Ctx extends object[]> {
  continuation: SingleContinuation<T, Ctx>;
  context: Ctx;
}

export abstract class Walker<T extends Cloneable> {
  // tslint:disable-next-line: variable-name
  static Permuted: WalkerTactic = WalkerTactic.Permuted;
  // tslint:disable-next-line: variable-name
  static Independent: WalkerTactic = WalkerTactic.Independent;
  descendants: Descendant<T>[];
  currentAction: Action<T>;
  currentResult: Descendant<T>;
  tactic: WalkerTactic;

  private updateList: Update<T, object[]>[];

  constructor(tactic: WalkerTactic) {
    this.descendants = [];
    assert(tactic);
    this.tactic = tactic;
  }

  onAction(action: Action<T>) {
    this.currentAction = action;
  }

  onResult(result: Descendant<T>): void {
    this.currentResult = result;
    this.updateList = [];
  }

  onResultDone(): void {
    this.runUpdateList(this.currentResult.result, this.updateList);
    this.currentResult = undefined;
    this.updateList = undefined;
  }

  onActionDone(): void {
    this.currentAction = undefined;
  }

  static walk<T extends Cloneable>(results: Descendant<T>[], walker: Walker<T>, action: Action<T>): Descendant<T>[] {
    walker.onAction(action);
    results.forEach(result => {
      walker.onResult(result);
      walker.onResultDone();
    });
    walker.onActionDone();
    return walker.descendants;
  }

  visit<Ctx extends object[]>(visitor: (obj: T, ...ctx: Ctx) => Continuation<T, Ctx>, ...context: Ctx): void {
    const continuation: Continuation<T, Ctx> = visitor.bind(this)(this.currentResult.result, ...context);
    if (!this.isEmptyResult(continuation)) {
      this.updateList.push({continuation, context});
    }
  }

  private runUpdateList(start: T, updateList: Update<T, object[]>[]) {
    const updated: {result: T, score: number}[] = [];
    if (updateList.length) {
      switch (this.tactic) {
        case WalkerTactic.Permuted: {
          let permutations: SingleUpdate<T, object[]>[][] = [[]];
          updateList.forEach(({continuation, context}) => {
            const newResults: SingleUpdate<T, object[]>[][] = [];
            if (typeof continuation === 'function') {
              continuation = [continuation];
            }
            continuation.forEach(f => {
              permutations.forEach(p => {
                const newP = p.slice();
                newP.push({continuation: f, context});
                newResults.push(newP);
              });
            });
            permutations = newResults;
          });

          for (let permutation of permutations) {
            const cloneMap = new Map<object, object>();
            const newResult = start.clone(cloneMap);
            let score = 0;
            permutation = permutation.filter(p => p.continuation !== null);
            if (permutation.length === 0) {
              continue;
            }
            permutation.forEach(({continuation, context}) => {
              score = continuation(newResult, ...context.map(c => cloneMap.get(c) || c));
            });

            updated.push({result: newResult, score});
          }
          break;
        }
        case WalkerTactic.Independent:
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation === 'function') {
              continuation = [continuation];
            }
            let score = 0;
            continuation.forEach(f => {
              if (f == null) {
                f = () => 0;
              }
              const cloneMap = new Map<object, object>();
              const newResult = start.clone(cloneMap);
              score = f(newResult, ...context.map(c => cloneMap.get(c) || c));
              updated.push({result: newResult, score});
            });
          });
          break;
        default:
          throw new Error(`${this.tactic} not supported`);
      }
    }

    // commit phase - output results.

    for (const newResult of updated) {
      this.createDescendant(newResult.result, newResult.score);
    }
  }

  // This function must be overriden to generate hash and valid values for the
  // kind of result being processed, and then call createWalkerDescendant,
  // below. See RecipeWalker for an example.
  abstract createDescendant(result: T, score: number): void;

  createWalkerDescendant(item: T, score: number, hash: Promise<string> | string, valid: boolean): void {
    assert(this.currentResult, 'no current result');
    assert(this.currentAction, 'no current action');
    if (this.currentResult.score) {
      score += this.currentResult.score;
    }
    this.descendants.push({
      result: item,
      score,
      derivation: [{parent: this.currentResult, strategy: this.currentAction}],
      hash,
      valid,
    });
  }

  isEmptyResult(result: Continuation<T, object[]>) {
    if (!result) {
      return true;
    }

    if (result.constructor === Array && result.length <= 0) {
      return true;
    }

    assert(typeof result === 'function' || result.length);

    return false;
  }
}
