import {Xen} from '../lib/xen.js';
const params = (new URL(document.location)).searchParams;
const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);
window.debugLevel = Xen.Debug.level = logLevel;

import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {App} from './app.js';

// run
(async () => {
  try {
    // configure arcs environment
    Utils.init('../..');
    // create a composer configured for node
    const composer = new RamSlotComposer();
    // run app
    window.arc = await App(composer);
  } catch (x) {
    console.error(x);
  }
  console.log('done.');
})();
