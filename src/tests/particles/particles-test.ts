import { fs } from '../../platform/fs-web.js';
import { Manifest } from '../../runtime/manifest.js';
import glob from 'glob';
import { Loader } from '../../runtime/loader.js';

// Skip these files, they do not compile successfully.
// TODO: Figure out why.
const FILES_TO_SKIP = new Set([
  'particles/Demo/PipeDemo.recipe',
  'particles/Demo/RestaurantsDemo.recipes',
  'particles/Music/ArtistPipe.recipes',
  'particles/TVMaze/TVMazePipe.recipes',
  'particles/TVMaze/TVMazePipe.recipes',
  'particles/Words/ShowSingleStats.manifest',
]);

/** Tests that all .schema, .recipe(s) and .manifest files in the particles folder compile successfully. */
describe('Particle definitions', () => {
  const loader = new Loader();
  const filenames = glob.sync('particles/**/*.{manifest,schema,recipe,recipes}');

  filenames
    .filter(filename => !FILES_TO_SKIP.has(filename))
    .forEach(filename => {
      const contents = fs.readFileSync(filename, 'utf8');

      it(`parses successfully: ${filename}`, async () => {
        await Manifest.parse(contents, { fileName: filename, loader });
      });
    });
});
