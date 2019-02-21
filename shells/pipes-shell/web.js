//import '../lib/build/pouchdb.js';
//import '../lib/build/firebase.js';
//import '../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';

console.log(`version: feb-21.2`);

window.DeviceClient = window.DeviceClient || {
  foundSuggestions(text) {
  }
};

window.ShellApi = {
  receiveEntity(json) {
    console.log('received entity...');
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
Utils.init(window.envPaths.root, window.envPaths.map);

let testMode;
const callback = text => {
  if (testMode) {
    console.log(`foundSuggestions (testMode): "${text}"`);
  } else {
    console.log(`invoking window.DeviceClient.foundSuggestions("${text}")`);
    console.log(window.DeviceClient.foundSuggestions.toString());
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
};

// test
window.ShellApi.receiveEntity();

document.body.onclick = () => {
  window.ShellApi.receiveEntity();
};