/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {assert} from '../../platform/chai-web.js';
import {Arc} from '../../runtime/arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {RecipeIndex} from '../recipe-index.js';
import {Id, ArcId} from '../../runtime/id.js';
import {Planner} from '../planner.js';
import {Suggestion} from '../plan/suggestion.js';
import {Modality} from '../../runtime/modality.js';

export class StrategyTestHelper {
  static createTestArc(context: Manifest, options: {arcId?: Id, modality?: Modality, loader?: Loader} = {}) {
    return new Arc({
      id: options.arcId || ArcId.newForTest('test-arc'),
      loader: options.loader || new Loader(),
      slotComposer: new SlotComposer(),
      modality: options.modality,
      context
    });
  }
  static createTestStrategyArgs(arc: Arc, args?) {
    return {recipeIndex: RecipeIndex.create(arc), ...args};
  }
  static async planForArc(arc: Arc): Promise<Suggestion[]> {
    const planner = new Planner();
    planner.init(arc, {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)});
    return planner.suggest();
  }

  static run(arc: Arc, clazz, recipe) {
    return new clazz(arc).generate({generated: [{result: recipe, score: 1}], terminal: []});
  }

  static onlyResult(arc: Arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(result => { assert.lengthOf(result, 1); return result[0].result;});
  }
  static theResults(arc: Arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(results => results.map(result => result.result)); // chicken chicken
  }

  static noResult(arc: Arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(result => { assert.isEmpty(result); });
  }
}
