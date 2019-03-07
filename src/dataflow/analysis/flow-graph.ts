/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe} from '../../runtime/recipe/recipe.js';

/**
 * Object derived from a Recipe that expresses the global graph of a Recipe in
 * a format suitable for use by data-flow analysis. This differs from a
 * RecipeWalker in that the RecipeWalker treats a Recipe as a tree defined by
 * the order of presentation rather than connectivity.  
 */
export class FlowGraph {
  constructor(recipe : Recipe) {
  // TODO: implement
  }
}