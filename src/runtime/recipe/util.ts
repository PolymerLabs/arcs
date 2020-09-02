/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe} from './internal/recipe.js';

// TODO(mmandlis): checking whether `recipe` is Recipe or RequireSection by
// `recipe instanceof RequireSection` causes a circular dependency. Either
// resolve it, or add boolean to recipe. Also the file name is too generic
// and should be improved.
export function isRequireSection(recipe: Recipe) {
  return 'parent' in recipe;
}
