/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {fs} from '../../platform/fs-web.js';
import {Manifest} from '../../runtime/manifest.js';
import glob from 'glob';
import {Loader} from '../../runtime/loader.js';
import {assert} from '../../platform/chai-web.js';

/** Tests that all .schema, .recipe(s) and .manifest files in the particles folder compile successfully. */
describe('Particle definitions', () => {
  const loader = new Loader();
  const filenames = glob.sync('particles/**/*.arcs');

  filenames
    .forEach(filename => {
      // skip experimental Native partices for now as they need a heavyweight build step
      if (filename.indexOf('Native') !== -1) {
        return;
      }
      it(`parses successfully: ${filename}`, async () => {
        const manifest = await Manifest.load(filename, loader);
        for (const particle of manifest.particles) {
          assert.isNotNull(particle.implFile, `particle ${particle.name} specified with implementation found in ${particle.implFile}.`);
          if (particle.implFile.endsWith('.js')) {
            assert.isTrue(fs.existsSync(particle.implFile), `${particle.implFile} not found`);
          }
        }
      });
    });
});
