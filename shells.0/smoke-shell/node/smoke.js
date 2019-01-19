// platform specific imports
import {Env} from '../../lib/env/node/env.js';
// platform agnostic imports
import {RamSlotComposer} from '../../lib/ram-slot-composer.js';
import {App} from '../app.js';

// notify user we are live
console.log('\n--- Arc Shell ---\n');

// create an arcs environment
new Env('../../..').pathMap[`https://$shell/`] = `../../../shells.2/`;

// run App
(async () => {
  try {
    // create a composer configured for node
    const composer = new RamSlotComposer();
    await App(composer);
  } catch (x) {
    console.error(x);
  }
})();
