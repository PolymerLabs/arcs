/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {Arc} from '../../arc.js';
import {assert} from '../chai-web.js';
import {RecipeIndex} from '../../recipe-index.js';
import {FakeSlotComposer} from '../../testing/fake-slot-composer.js';

export class StrategyTestHelper {
  static createTestArc(context, options = {}) {
    return new Arc({
      id: options.arcId || 'test-arc',
      context,
      slotComposer: new FakeSlotComposer(options)
    });
  }
  static createTestStrategyArgs(arc, args) {
    return Object.assign({recipeIndex: RecipeIndex.create(arc)}, args);
  }
  static run(arc, clazz, recipe) {
    return new clazz(arc).generate({generated: [{result: recipe, score: 1}], terminal: []});
  }
  static onlyResult(arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(result => { assert.lengthOf(result, 1); return result[0].result;});
  }
  static theResults(arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(results => results.map(result => result.result)); // chicken chicken
  }

  static noResult(arc, clazz, recipe) {
    return StrategyTestHelper.run(arc, clazz, recipe).then(result => { assert.isEmpty(result); });
  }
}
