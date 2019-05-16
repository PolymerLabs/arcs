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
 * A FlowConfig is a configuration of a dataflow analysis run. Currently this
 * consists only of a set of assertions, although later it might include
 * configuration options. 
 */
export class FlowConfig {
  public assertions : FlowAssertion[] = [];  // parsed assertions usable by FlowChecker

  // Input is the contents of a fcfg file, consisting of comments, blank lines, 
  // whatever configuration parameters we may decide to include in the future,
  // and a set of assertions to test. The assertions are expressed in the 
  // syntax defined in 
  // https://docs.google.com/document/d/1sQPYE4GEZKrIgMwvcs6Od3C-kBc8bhALY-xwz8bwimU/edit#
  // In addition to the syntactic contraints specified by the grammar, the set
  // of assertions in any one configuration may not contain duplicate names.
  // Throws an exception if the input is invalid in any way.
  //
  constructor(input : string) {
    if ((input === undefined) || (input.trim().length === 0)) {
      throw new Error('Flow configuration is empty');
    }
    // There are currently no configuration parameters, so the entire file is
    // just comments, blanks, or assertions. 
    const lines = input.split('\n');
    for (const l of lines) {
      const line = l.trim();
      if ((line.length === 0) || (line.startsWith('//'))) {
        continue;
      }
      // This will throw if the line does not parse; just let it propagate.
      const newGuy = new FlowAssertion(line);
      for (const old of this.assertions) {
        if (old.name === newGuy.name) {
          throw new Error('Flow config error: Assertion with name <' 
                          + newGuy.name + '> defined more than once.' );
        }
      }
      this.assertions.push(newGuy);
    }
    if (this.assertions.length === 0) {
      throw new Error('Flow configuration contains no assertions');
    }
  }
}