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

export interface Descendant {
  result; // TODO: Make Walker genericly typed.
  score: number;
  derivation: {
    parent: Descendant;
    strategy: Action
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
export abstract class Action {
  private readonly _arc?: Arc;
  private _args?;

  constructor(arc?: Arc, args?) {
    this._arc = arc;
    this._args = args;
  }

  get arc(): Arc | undefined {
    return this._arc;
  }

  getResults(inputParams) {
    return inputParams.generated;
  }

  async generate(inputParams): Promise<Descendant[]> {
    return [];
  }

}

export abstract class Walker {
  // tslint:disable-next-line: variable-name
  static Permuted: WalkerTactic = WalkerTactic.Permuted;
  // tslint:disable-next-line: variable-name
  static Independent: WalkerTactic = WalkerTactic.Independent;
  descendants: Descendant[];
  currentAction: Action;
  currentResult: Descendant;
  tactic: WalkerTactic;

  constructor(tactic: WalkerTactic) {
    this.descendants = [];
    assert(tactic);
    this.tactic = tactic;
  }

  onAction(action: Action) {
    this.currentAction = action;
  }

  onResult(result: Descendant): void {
    this.currentResult = result;
  }

  onResultDone(): void {
    this.currentResult = undefined;
  }

  onActionDone(): void {
    this.currentAction = undefined;
  }

  static walk(results: Descendant[], walker: Walker, action: Action): Descendant[] {
    walker.onAction(action);
    results.forEach(result => {
      walker.onResult(result);
      walker.onResultDone();
    });
    walker.onActionDone();
    return walker.descendants;
  }

  _runUpdateList(start, updateList) {
    const updated = [];
    if (updateList.length) {
      switch (this.tactic) {
        case WalkerTactic.Permuted: {
          let permutations = [[]];
          updateList.forEach(({continuation, context}) => {
            const newResults = [];
            if (typeof continuation === 'function') {
              continuation = [continuation];
            }
            continuation.forEach(f => {
              permutations.forEach(p => {
                const newP = p.slice();
                newP.push({f, context});
                newResults.push(newP);
              });
            });
            permutations = newResults;
          });

          for (let permutation of permutations) {
            const cloneMap = new Map();
            const newResult = start.clone(cloneMap);
            let score = 0;
            permutation = permutation.filter(p => p.f !== null);
            if (permutation.length === 0) {
              continue;
            }
            permutation.forEach(({f, context}) => {
              if (context) {
                score = f(newResult, ...context.map(c => cloneMap.get(c) || c));
              } else {
                score = f(newResult);
              }
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
              const cloneMap = new Map();
              const newResult = start.clone(cloneMap);
              if (context) {
                score = f(newResult, ...context.map(c => cloneMap.get(c) || c));
              } else {
                score = f(newResult);
              }
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
      const result = this.createDescendant(newResult.result, newResult.score);
    }
  }

  // This function must be overriden to generate hash and valid values for the
  // kind of result being processed, and then call createWalkerDescendant,
  // below. See RecipeWalker for an example.
  abstract createDescendant(result, score): void;

  createWalkerDescendant(item, score, hash, valid): void {
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

  isEmptyResult(result) {
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
