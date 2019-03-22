/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse} from '../../gen/dataflow/analysis/assertion-parser.js';

import {FlowGraph} from './flow-graph.js';

export class FlowAssertResult {
  result : boolean;
  reason? : string; // undefined if result is true
}

/**
 * Object that captures an assertion to be checked on a recipe as part of data
 * flow analysis. Assertions are specified using the syntax defined in 
 * https://docs.google.com/document/d/1sQPYE4GEZKrIgMwvcs6Od3C-kBc8bhALY-xwz8bwimU/edit#
 *
 */
export class FlowAssertion {
  source : string; // The original string this FlowAssertion was created from.
  name : string; // Shortened name to be used when reporting failure.
  

  constructor(s : string) {
    // console.log('Parsing assertion <' + s + '>');
    // This will throw if it fails
    const parsed = parse(s);
    this.source = s;
    this.name = s.split(":")[0].trim();
    // TODO Post-parse processing of this assertion. Alternatively, put js into
    // the peg file so that the parser returns the right stuff.
  }

  check(graph : FlowGraph) : FlowAssertResult {
    // TODO: implement
    return {result: false, 
            reason: 'Assertion ' + this.name + ' failed. reason: ' + "dunno why; just 'cause"};
  }
}
