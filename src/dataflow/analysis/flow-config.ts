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
 * the assertions is parsed in the constructor.
 */
export class FlowConfig {
  public assertions : (FlowAssertion[]);  // parsed assertions usable by FlowChecker

  // Input is the contents of a fcfg file, consisting of comments, blank lines, 
  // whatever configuration parameters we may decide to include in the future,
  // and a set of assertions to test. The assertions are expressed in the 
  // syntax defined in 
  // https://docs.google.com/document/d/1sQPYE4GEZKrIgMwvcs6Od3C-kBc8bhALY-xwz8bwimU/edit#
  // In addition to the syntactic contraints specified by the grammar, the set
  // of assertions in any one configuration may not contain duplicate names.
  // Throws an exception if the input is invalid.
  //
  constructor(input : string) {
    // There are currenlty no configuration parameters, so the entire file is
    // just comments, blanks, or assertions. 
    const lines = input.split('\n');
    for (l of lines) {
      const line = l.trim();
        if ((line.length === 0) && (line.startswith("//")) {
          continue;
        }
        // This will throw if the line does not parse
        let numAssertions = this.assertions.push(new FlowAssertion(line));
        // TODO Check that this Assertion doesn't have the same name as any of the
        // Ones that already exist. If so, throw.
    }
  }
}