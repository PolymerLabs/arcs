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
import {Manifest, ManifestWarning} from '../runtime/manifest.js';
import {Loader} from '../platform/loader.js';

// Script to check that a bundle of Arcs manifest files, particle
// implementations and JSON data files is complete (i.e. no explicitly mentioned
// dependencies are missing).
//
// To be run with the arcs_manifest BUILD rule.

/**
 * Loads the given .arcs manifest file and checks it for errors. Errors are
 * thrown as an exception.
 */
async function checkManifest(src: string) {
  const loader = new Loader({});
  const manifest = await Manifest.load(src, loader);

  // Look for errors from parsing the manifest (ignore warnings). This covers
  // missing .arcs imports.
  const manifestErrors = manifest.errors
      .filter(error => !(error instanceof ManifestWarning))
      .map(error => error.toString());

  if (manifestErrors.length) {
    throw manifestErrors.join('\n');
  }

  // Check particle impls can be loaded.
  for (const {implFile} of manifest.particles) {
    // Particle may not have an implementation. Might be an Android particle,
    // so this is possibly fine. Just skip it.
    if (implFile) {
      await loader.loadResource(implFile);
    }
  }
}

async function main() {
  const opts = minimist(process.argv.slice(2), {
    string: ['src'],
  });
  const srcs: string[] = typeof opts.src === 'string' ? [opts.src] : opts.src;

  let foundError = false;

  for (const src of srcs) {
    try {
      await checkManifest(src);
    } catch (e) {
      // Catch exceptions and report them as errors.
      console.error(`Errors encountered when parsing manifest '${src}':`);
      console.error(e);
      foundError = true;
    }
  }

  if (foundError) {
    process.exit(1);
  }
}

void main();
