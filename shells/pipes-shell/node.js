//import {fetch} from '../../build/platform/fetch-node.js';
//global.fetch = fetch;
//console.log(fetch);

import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {App} from './app.js';

// run
(async () => {
  try {
    // configure arcs environment
    Utils.init('.');
    // create a composer configured for node
    const composer = new RamSlotComposer();
    // run app
    await App(composer);
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
})();
