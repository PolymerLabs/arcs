#!/usr/bin/env -S node --experimental-modules --no-deprecation --loader=./tools/custom-loader.mjs -r source-map-support/register.js
/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import {Manifest} from '../runtime/manifest.js';
import {Schema} from '../runtime/schema.js';
import {toProtoFile} from './wasm-tools.js';
import {Utils} from '../../shells/lib/runtime/utils.js';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2), {
  string: ['output'],
  boolean: ['help'],
  alias: {o: 'output'},
});

if (argv.help || argv._.length === 0) {
  console.log(`Usage
  $ schema2proto [-options] [file ...]

Description
  Creates a .proto files from manifests.

Options
  --output, -o   output directory name for all proto files
  --help         usage info

Examples [Must be run from Arcs repository root]
  $ schema2proto --output particles/native/wasm/proto particles/canonical.manifest`);
  process.exit();
}

// Converts schema definitions specifies in Manifest files to proto2 specifications.
void (async () => {
  Utils.init('../..');

  async function processFiles(paths, destDir) {

    const visited = new Set<Schema>();
    for (const path of paths) {
      try {
        const manifest = await Utils.parse('import \'' + path + '\'');
        await processManifest(manifest, visited, destDir);
      } catch (err) {
        console.error(`Error reading '${path}':`);
        console.log('Is your manifest resource not relative to the Arcs repo root?');
        continue;
      }
    }
  }

  async function processManifest(manifest: Manifest, visited: Set<Schema>, destDir: string) {
    for (const schema of Object.values(manifest.schemas)) {
     try {
      if (visited.has(schema)) {
        continue;
      }
      visited.add(schema);
      const protoFile = await toProtoFile(schema);
      fs.writeFileSync(destDir + '/' + schema.name + '.proto', protoFile);
     } catch (e) {
      console.error(e);
     }
    }
    for (const imp of manifest.imports) {
      await processManifest(imp, visited, destDir);
    }
  }

  async function main() {
    const destDir = argv.o;

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, {recursive: true});
    }

    if (!fs.statSync(destDir).isDirectory()) {
      console.log(destDir + ' exists, but is not a directory.');
      process.exit(1);
    }

    await processFiles(argv._, destDir);
  }

  console.log();
  await main();
  console.log();
  process.exit();
})();
