import {Utils} from '../lib/utils.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {App} from './app.js';

let testMode;

const ShellApi = {
  receiveEntity(json) {
    testMode = !json;
    run();
  }
};
global.ShellApi = ShellApi;

const DeviceClient = {
  foundSuggestions(text) {
    console.log('foundSuggestions:', text);
  }
};
global.DeviceClient = DeviceClient;

const callback = text => {
  if (testMode) {
    console.log('foundSuggestions (testMode):', text);
  } else {
    DeviceClient.foundSuggestions(text);
  }
};

const run = async () => {
  try {
    // configure arcs environment
    Utils.init('.');
    // create a composer configured for node
    const composer = new RamSlotComposer();
    // run app
    await App(composer, callback);
  } catch (x) {
    console.error(x);
  }
};

// test
ShellApi.receiveEntity();