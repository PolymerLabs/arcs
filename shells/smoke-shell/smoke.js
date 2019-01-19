import {App} from './app.js';
import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';

// notify user we are live
console.log('\n--- Arcs Shell ---\n');

// run
(async () => {
  try {
    // configure arcs environment
    Utils.init('../..');
    // create a composer configured for node
    const composer = new RamSlotComposer();
    await App(composer);
  } catch (x) {
    console.error(x);
  }
  console.log('');
})();
