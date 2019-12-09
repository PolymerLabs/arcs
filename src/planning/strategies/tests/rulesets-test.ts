/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Arc} from '../../../runtime/arc.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Recipe} from '../../../runtime/recipe/recipe.js';
import {AnnotatedDescendant, Generation, Planner} from '../../planner.js';
import {Ruleset, StrategizerWalker, Strategy, StrategyParams} from '../../strategizer.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

class InitPopulation extends Strategy {
  private readonly _context: Manifest;

  constructor(arc: Arc) {
    super();
    this._context = arc.context;
  }

  async generate({generation}: StrategyParams) {
    if (generation !== 0) return [];

    const recipe = this._context.recipes[0];
    recipe.normalize();

    return [{
      result: recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe),
    }];
  }
}

class FateAssigner extends Strategy {
  fate;
  constructor(fate) {
    super();
    this.fate = fate;
  }

  async generate(inputParams: StrategyParams) {
    const self = this;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandle(recipe, handle) {
        if (handle.fate === '?') {
          return [
            (recipe, handleCopy) => {handleCopy.fate = self.fate; return 1;},
            null
          ];
        }
        return undefined;
      }
    }(StrategizerWalker.Permuted), this);
  }
}

class AssignFateA extends FateAssigner {constructor() {super('copy');}}
class AssignFateB extends FateAssigner {constructor() {super('map');}}
class AssignFateC extends FateAssigner {constructor() {super('use');}}

class Resolve extends Strategy {
  async generate(inputParams: StrategyParams) {
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandle(recipe, handle) {
        if (handle.fate !== '?' && !handle.id.endsWith('resolved')) {
          return [
            (recipe, handleCopy) => {
              handleCopy.id += '-resolved';
              return 1;
            }
          ];
        }
        return undefined;
      }
    }(StrategizerWalker.Permuted), this);
  }
}

describe('Rulesets', () => {
  it('detects a loop in ordering rules', () => {
    assert.throws(() => {
      new Ruleset.Builder()
          .order(AssignFateA, AssignFateB)
          .order(AssignFateB, AssignFateC)
          .order(AssignFateC, AssignFateA)
          .build();
    }, 'Detected a loop in the ordering rules');
    assert.throws(() => {
      new Ruleset.Builder()
          .order(AssignFateA, AssignFateB, AssignFateC, AssignFateA)
          .build();
    }, 'Detected a loop in the ordering rules');
  });

  const planAndComputeStats = async options => {
    const arc = StrategyTestHelper.createTestArc(options.context);
    const planner = new Planner();
    planner.init(arc, options);
    const generations: Generation[] = [];
    await planner.plan(Infinity, generations);
    const recipes = ([] as AnnotatedDescendant[]).concat(...generations.map(instance => instance.generated));
    return {
      total: recipes.length,
      fateAssigned: recipes.reduce((acc, r) => acc + Number(r.result.handles.every(h => h.fate !== '?')), 0),
      // Not using recipe.isResolved(), as those recipes are not truly resolved.
      resolved: recipes.reduce((acc, r) => acc + Number(r.result.handles.every(h => (h.fate !== '?' && h.id.endsWith('resolved')))), 0),
      redundantDerivations: recipes.reduce((acc, r) => acc + r.derivation.length - 1, 0)
    };
  };

  it('respects ordering rules in a small example', async () => {
    const strategies = [InitPopulation, AssignFateA, AssignFateB];
    const context = await Manifest.parse(`
      recipe
        handle1: ? 'id1'
        handle2: ? 'id2'`);
    const statsNoRules = await planAndComputeStats({
      context,
      strategies
    });
    const statsLinear = await planAndComputeStats({
      context,
      strategies,
      ruleset: new Ruleset.Builder()
        .order(AssignFateA, AssignFateB)
        .build()
    });

    // Regardless of the ruleset, there are 4 results with fates decided:
    // Each handle can be assigned fate A or B.
    assert.strictEqual(statsNoRules.fateAssigned, 4);
    assert.strictEqual(statsLinear.fateAssigned, 4);

    // Regardless of the ruleset, there are 9 total results:
    // Each handle can have fate ?, A or B.
    assert.strictEqual(statsNoRules.total, 9);
    assert.strictEqual(statsLinear.total, 9);

    // Recipes with both handles assigned to the same fate
    // can be derived in 3 different ways:
    // 1) Both assigned in the same strategy run.
    // 2) 'id1' assigned in the first run, 'id2' in the second.
    // 3) 'id2' assigned in the first run, 'id1' in the second.
    // 2 of above 3 are redundant, with 2 fates with have 4 redundant derivations.
    assert.strictEqual(statsLinear.redundantDerivations, 4);
    // Without a linear ordering we additionally get 1 redundant derivation for
    // each of 2 recipes with handles having different fates assigned.
    // Each of those can be achieved by running AssignFateA then AssignFateB,
    // or the other way around.
    assert.strictEqual(statsNoRules.redundantDerivations, 6);
  });

  it('respects ordering rules in a big example', async () => {
    const strategies = [
      InitPopulation, AssignFateA, AssignFateB, AssignFateC, Resolve
    ];
    const context = await Manifest.parse(`
      recipe
        handle1: ? 'id1'
        handle2: ? 'id2'
        handle3: ? 'id3'`);
    const statsNoRules = await planAndComputeStats({
      context,
      strategies
    });
    const statsPhased = await planAndComputeStats({
      context,
      strategies,
      ruleset: new Ruleset.Builder()
        .order([AssignFateA, AssignFateB, AssignFateC], Resolve)
        .build()
    });
    const statsLinear = await planAndComputeStats({
      context,
      strategies,
      ruleset: new Ruleset.Builder()
        .order(AssignFateA, AssignFateB, AssignFateC, Resolve)
        .build()
    });

    // Regardless of the ruleset, there are 27 resolved results:
    // Each of 3 handles can be assigned fate A, B, C and needs to be resolved.
    assert.strictEqual(statsNoRules.resolved, 27);
    assert.strictEqual(statsPhased.resolved, 27);
    assert.strictEqual(statsLinear.resolved, 27);

    // Considering all intermediate recipes, each handle can be in one of 7 states:
    // [?, A unresolved, B unresolved, C unresolved, A resolved, B resolved, C resolved]
    // 7 ^ 3 = 343
    //
    // Ensuring that Resolve is the last strategy to be run
    // eliminates some intermediate results.
    // If Resolve IS NOT in recipe's deriviations, each handle can be in one of 4 states:
    // [?, A unresolved, B unresolved, C unresolved]
    // 4 ^ 3 = 64
    // If Resolved IS in recipe's deriviations, each handle can be in one of 4 states:
    // [?, A resolved, B resolved, C resolved]
    // With the exception of all handles being '?', in which case Resolve couldn't have been involved.
    // 4 ^ 3 - 1 = 63
    // 64 + 63 = 127
    assert.strictEqual(statsNoRules.total, 343);
    assert.strictEqual(statsPhased.total, 127);
    assert.strictEqual(statsLinear.total, 127);

    // Number of redundant derivations is decreased with a linear rule.
    // Explaining these numbers would probably be quite laborious...
    assert.strictEqual(statsNoRules.redundantDerivations, 444);
    assert.strictEqual(statsPhased.redundantDerivations, 120);
    assert.strictEqual(statsLinear.redundantDerivations, 54);
  });
});
