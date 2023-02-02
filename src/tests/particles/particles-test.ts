/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {fs} from '../../platform/fs-web.js';
import {Manifest} from '../../runtime/manifest.js';
import glob from 'glob';
import {Loader} from '../../platform/loader.js';
import {assert} from '../../platform/chai-web.js';
import {Runtime} from '../../runtime/runtime.js';

/** Tests that all .schema, .recipe(s) and .manifest files in the particles folder compile successfully. */
describe('Particle definitions', () => {
  let runtime;
  const filenames = glob.sync('particles/**/*.arcs');

  beforeEach(() => {
    runtime = new Runtime();
  });

  filenames
    .forEach(filename => {
      // skip experimental Native partices for now as they need a heavyweight build step
      if (filename.indexOf('Native') !== -1) {
        return;
      }
      it(`parses successfully: ${filename}`, async () => {
        const manifest = await runtime.parseFile(filename);
        for (const particle of manifest.particles) {
          if (particle.implFile == null) {
            // It's ok for some particles to not have implementation files (e.g.
            // Android particles).
            continue;
          }
          if (particle.implFile.endsWith('.js')) {
            assert.isTrue(fs.existsSync(particle.implFile), `${particle.implFile} not found`);
          }
        }
      });
    });
});
