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
import {FlowConfig} from './flowconfig.js';
/**
 * Object used to perform dataflow analysis on recipes. The constructor accepts
 * a FlowConfig object containing the set of assertions to be checked, then the
 * flowcheck method checks a recipe against that set, returning true if all the
 * assertions are true for the recipe and false if any one is false.
 */
export class FlowChecker {
  assertions : string[];

  constructor(flowconfig : FlowConfig) {
    this.assertions = flowconfig.assertions;
  }

  flowcheck(target : Recipe) : boolean {
    return false;
  }
}