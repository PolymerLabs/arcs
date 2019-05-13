#!/usr/bin/env -S node --experimental-modules --no-deprecation --loader=./tools/custom-loader.mjs -r source-map-support/register.js
/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import {Manifest} from '../runtime/manifest.js';
import {Schema} from '../runtime/schema.js';
import {toProtoFile} from '../runtime/wasm-tools.js';
import {Utils} from '../../shells/lib/runtime/utils.js';

// Converts schema definitions specifies in Manifest files to proto2 specifications.
void (async () => {
  Utils.init('../..');

  const usage = 'Usage: schema2proto <manifest-files>';

  async function processFiles(paths) {

    const visited = new Set<Schema>();
    for (const path of paths) {
      let manifest;
      try {
        manifest = await Utils.parse("import '" + path + "'");
        processManifest(manifest, visited);
      } catch (err) {
        console.error(`Error reading '${path}':`);
        console.log('Is your manifest resource not relative to the Arcs repo root?');
        continue;
      }
    }
  }

  async function processManifest(manifest: Manifest, visited: Set<Schema>) {
    for (const schemaKey of Object.keys(manifest.schemas)) { 
     try {
      const schema = manifest.schemas[schemaKey];
      if (visited.has(schema)) {
        continue;
      }
      visited.add(schema);
      const protoFile = await toProtoFile(manifest.schemas[schemaKey]);
      console.log(protoFile);
     } catch(e) {
      console.error(e);
     }
    }
    for (const imp of manifest.imports) {
      processManifest(imp, visited);
    }
  }

  async function main() {
    if (!fs.existsSync(process.cwd() + '/tools/schema2proto')) {
      console.log('schema2proto must be run from the root level of the arcs repository.');
      process.exit(1);
    }

    // First two entries in argv are the node binary and this file.
    const args = process.argv.slice(2);
    await processFiles(args);
  }

  console.log();
  await main();
  console.log();
  process.exit();
})();
