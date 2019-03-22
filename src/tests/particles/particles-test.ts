import { fs } from '../../platform/fs-web.js';
import { Manifest } from '../../runtime/manifest.js';
import glob from 'glob';
import { Loader } from '../../runtime/loader.js';

/** Tests that all .schema, .recipe(s) and .manifest files in the particles folder compile successfully. */
describe('Particle definitions', () => {
  const loader = new Loader();
  const filenames = glob.sync('particles/**/*.{manifest,schema,recipe,recipes}');

  filenames
    .forEach(filename => {
      const contents = fs.readFileSync(filename, 'utf8');

      it(`parses successfully: ${filename}`, async () => {
        await Manifest.parse(contents, { fileName: filename, loader });
      });
    });
});
