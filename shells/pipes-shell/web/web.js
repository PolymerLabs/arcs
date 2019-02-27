/*
* @license
* Copyright (c) 2019 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

import './config.js';
// optional pouchdb support
import '../../lib/build/pouchdb.js';
import '../../../build/runtime/storage/pouchdb/pouchdb-provider.js';
// optional firebase support
//import '../lib/build/firebase.js';
// optional sourcemapped-stacktrace support
//import '../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js';
import {RamSlotComposer} from '../../lib/ram-slot-composer.js';
//import {Stores} from '../../lib/stores.js';
import {Utils} from '../../lib/utils.js';
//import {Schemas} from '../schemas.js';
import {App, initPipesArc, observeEntity} from '../app.js';
import {SyntheticStores} from '../../lib/synthetic-stores.js';

console.log(`version: feb-26.0`);

// window.DeviceClient = window.DeviceClient || {
//   foundSuggestions(text) {
//   }
// };

// usage:
// ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)

window.ShellApi = {
  receiveEntity(json) {
    console.log('received entity...');
    testMode = !json;
    run(json);
    return true;
  },
  async observeEntity(json) {
    console.log('observing entity...');
    let rawData;
    try {
      rawData = JSON.parse(json);
      console.log(rawData);
    } catch (x) {
      return false;
    }
    observeEntity(rawData);
    //const store = context.findStoreById('addresses');
    //await store.store({id: store.generateID(), rawData: {address: rawData.name}}, ['oogabooga']);
    //console.log(await store.toList());
    return true;
  }
};

const storage = 'pouchdb://local/arcs/';

// not sure why
SyntheticStores.init();

// configure arcs environment
Utils.init(window.envPaths.root, window.envPaths.map);

let testMode;
const callback = text => {
  if (testMode) {
    console.log(`foundSuggestions (testMode): "${text}"`);
  } else {
    console.log(`invoking window.DeviceClient.foundSuggestions("${text}")`);
    //console.log(window.DeviceClient.foundSuggestions.toString());
    if (window.DeviceClient) {
      window.DeviceClient.foundSuggestions(text);
    }
  }
};

let context;
const initContext = async () => {
  context = await Utils.parse('');
  await initAddressStore(context);
  return context;
};

const initAddressStore = async context => {
  // const store = await Stores.create(context, {
  //   name: 'addresses',
  //   id: 'addresses',
  //   schema: Schemas.Address,
  //   isCollection: true,
  //   tags: null,
  //   storageKey: null
  // });
  // console.log(store);
  window.ShellApi.observeEntity(`{"type": "address", "name": "North Pole"}`);
  window.ShellApi.observeEntity(`{"type": "address", "name": "South Pole"}`);
};

let pipesArc;

const run = async json => {
  try {
    if (!pipesArc) {
      pipesArc = await initPipesArc(storage);
    }
    if (!context) {
      //await initContext();
    }
    const composer = new RamSlotComposer();
    window.arc = await App(composer, pipesArc, callback, storage, json);
  } catch (x) {
    console.error(x);
  }
};

// test
//window.ShellApi.receiveEntity();

window.onclick = () => {
  window.ShellApi.receiveEntity();
};
