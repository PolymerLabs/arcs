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
import {Modality} from '../../runtime/arcs-types/modality.js';
import {Runtime} from '../../runtime/runtime.js';
import {ArcInfo} from '../../runtime/arc-info.js';

export class StrategyTestHelper {
  static async createTestArcInfo(context: Manifest, options: {id?: Id, modality?: Modality, loader?: Loader} = {}): Promise<ArcInfo> {
    const runtime = new Runtime({context, loader: options.loader || new Loader()});
    return runtime.allocator.startArc({arcName: 'test-arc', ...options});
  }
  static async createTestArc(context: Manifest, options: {id?: Id, modality?: Modality, loader?: Loader} = {}): Promise<Arc> {
    const runtime = new Runtime({context, loader: options.loader || new Loader()});
    return runtime.getArcById((await runtime.allocator.startArc({arcName: 'test-arc', ...options})).id);
  }
  static createTestStrategyArgs(arcInfo: ArcInfo, args?) {
    return {recipeIndex: RecipeIndex.create(arcInfo), ...args};
  }
  static async planForArc(runtime: Runtime, arc: Arc): Promise<Suggestion[]> {
    const planner = new Planner();
    planner.init(arc, {runtime, strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc.arcInfo), noSpecEx: true});
    return planner.suggest();
  }

  static run(arcInfo: ArcInfo, clazz, recipe) {
    return new clazz(arcInfo).generate({generated: [{result: recipe, score: 1}], terminal: []});
  }

  static onlyResult(arcInfo: ArcInfo, clazz, recipe) {
    return StrategyTestHelper.run(arcInfo, clazz, recipe).then(result => { assert.lengthOf(result, 1); return result[0].result;});
  }
  static theResults(arcInfo: ArcInfo, clazz, recipe) {
    return StrategyTestHelper.run(arcInfo, clazz, recipe).then(results => results.map(result => result.result)); // chicken chicken
  }

  static noResult(arcInfo: ArcInfo, clazz, recipe) {
    return StrategyTestHelper.run(arcInfo, clazz, recipe).then(result => { assert.isEmpty(result); });
  }
}
