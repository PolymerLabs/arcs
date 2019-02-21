//import '../lib/build/pouchdb.js';
//import '../lib/build/firebase.js';
//import '../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

console.log(`version: feb-20.6`);

window.DeviceClient = window.DeviceClient || {
  foundSuggestions(text) {
    console.log('foundSuggestions:', text);
  }
};

window.ShellApi = {
  receiveEntity(json) {
    testMode = !json;
    run(json);
    return true;
  }
};

import {Xen} from '../lib/xen.js';
//const params = (new URL(document.location)).searchParams;
//const logLevel = params.get('logLevel') || (params.has('log') ? 2 : Xen.Debug.level);
//window.debugLevel = Xen.Debug.level = logLevel;
Xen.Debug.level = window.logLevel;

import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {App} from './app.js';
import '../configuration/whitelisted.js';

// configure arcs environment
Utils.init('.', {
  //'https://$build/': `./`,
  'https://$build/': `https://behelits.com/projects/arcs/arcs/shells/lib/build/`,
  'https://$particles/': `https://behelits.com/projects/arcs/arcs/particles/`
});

let testMode;
const callback = text => {
  if (testMode) {
    console.log('foundSuggestions (testMode):', text);
  } else {
    window.DeviceClient.foundSuggestions(text);
  }
};

const run = async json => {
  try {
    const composer = new RamSlotComposer();
    await App(composer, callback, json);
  } catch (x) {
    console.error(x);
  }
  //console.log('done.');
};

// test
window.ShellApi.receiveEntity();
