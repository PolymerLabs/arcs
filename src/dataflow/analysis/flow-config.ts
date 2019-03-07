/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowAssertion} from './flow-assertion.js';

/**
 * A FlowConfig is a set of assertions used to configure a FlowChecker,
 * along with any assertion-related metadata. The language for specifying
 * the assertions is parsed in the constructor, or, if we choose to have
 * a FlowAssertion class, each assertion is parsed in the FlowAssertion
 * constructor.
 */
export class FlowConfig {
  public assertions : (FlowAssertion[]);  // parsed assertions usable by FlowChecker

  constructor(input : string[]) { // input is raw set of assertions, e.g. contents of a file
    this.assertions = input.map(i => FlowAssertion.instantiate(i));
  }
}