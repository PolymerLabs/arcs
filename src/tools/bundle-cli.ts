/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import minimist from 'minimist';

import {bundle} from './bundle.js';

const argv = minimist(process.argv.slice(2), {
  string: ['output'],
  boolean: ['verbose', 'help'],
  alias: {o: 'output', v: 'verbose'},
  default: {
    output: 'bundle.zip',
    verbose: false
  }
});

if (argv.help || argv._.length === 0) {
  console.log(`Usage
  $ bundle [-options] [file ...]

Description
  Creates a zip bundle containing all transitive dependencies of an Arcs manifest.

Options
  --output, -o   name of the created bundle, bundle.zip by default
  --verbose, -v  list bundled files
  --help         usage info

Examples
  $ bundle Feature.arcs
  $ bundle -v -o mybundle.zip recipes/Feature.arcs recipes/ExtraStuff.arcs`);
  process.exit();
}

if (Array.isArray(argv.output)) {
  console.error('Only one output path can be specified');
  process.exit(1);
}

void bundle(argv._, argv.output, argv.verbose).catch(e => {
  console.error(e.message);
  process.exit(1);
});
