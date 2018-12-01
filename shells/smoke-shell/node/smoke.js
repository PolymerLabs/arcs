// platform specific imports
import '../../env/node/arcs.js';
import {Env} from '../../env/node/env.js';
import {RamSlotComposer} from '../../lib/ram-slot-composer.js';

// platform agnostic imports
import {App} from '../app.js';

// notify user we are live
console.log('\n--- Arc Shell ---\n');

// create a composer configured for node
const composer = new RamSlotComposer();

// create an arcs environment
const env = new Env('../../..');
env.pathMap[`https://$artifacts/`] = `../../../particles/`;

// run App
(async () => {
  try {
    await App(env, composer);
  } catch (x) {
    console.error(x);
  }
})();
