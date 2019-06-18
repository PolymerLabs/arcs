/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {FlowGraph, ValidationResult} from '../arcs-dataflow.js';
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {fs} from '../../platform/fs-web.js';

// TODO make this a function and test it; it's big enough now

void (async () => {

  const manifestFile = process.argv[1];
  if (manifestFile === undefined) {
    console.error('Usage: flowcheck <manifest file>');
    process.exit(1);
  }
  
  let manifest : Manifest;
  
  try {
    manifest = await Manifest.load(manifestFile, new Loader());
  } catch (e) {
    console.error(e);
    process.exit(1);
    // Make the compiler happy. It doesn't recognize exit as a return.
    // TODO: Is there a compiler flag for this that we could put here?
    return;
  }

  manifest.allRecipes.forEach(recipe => {
    const flowgraph = new FlowGraph(recipe);
    console.log('Checking recipe ' + recipe.name);
    const res = flowgraph.validateGraph();
    if (!res.isValid) {
      console.error('Data-flow check failed. Reasons: ' + res.failures);
      process.exit(1);
    } else {
      console.log('Data-flow check passed');
    }
  });
})();
