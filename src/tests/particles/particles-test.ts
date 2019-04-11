import { fs } from '../../platform/fs-web.js';
import { Manifest } from '../../runtime/manifest.js';
import glob from 'glob';
import { Loader } from '../../runtime/loader.js';
import {assert} from '../../platform/chai-web.js';

/** Tests that all .schema, .recipe(s) and .manifest files in the particles folder compile successfully. */
describe('Particle definitions', () => {
  const loader = new Loader();
  const filenames = glob.sync('particles/**/*.{manifest,schema,recipe,recipes}');

  filenames
    .forEach(filename => {
      it(`parses successfully: ${filename}`, async () => {
        const manifest = await Manifest.load(filename, loader);
        for (const particle of manifest.particles) {
          assert.isTrue(fs.existsSync(particle.implFile), `${particle.implFile} not found`);
        }
      });
    });
});
