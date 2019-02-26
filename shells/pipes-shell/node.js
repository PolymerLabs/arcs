/*
* @license
* Copyright (c) 2019 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

import './config-node.js';

console.log(`version: feb-26.0`);

global.DeviceClient = global.DeviceClient || {
  foundSuggestions(text) {
  }
};

// usage:
// ShellApi.observeEntity(`{"type": "address", "name": "North Pole"}`)

global.ShellApi = {
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
    const store = context.findStoreById('addresses');
    await store.store({id: store.generateID(), rawData: {address: rawData.name}}, ['oogabooga']);
    console.log(await store.toList());
    return true;
  }
};

import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {Stores} from '../lib/stores.js';
import {Utils} from '../lib/utils.js';
import {Schemas} from './schemas.js';
import {App} from './app.js';

//import '../configuration/whitelisted.js';

// configure arcs environment
Utils.init(global.envPaths.root, global.envPaths.map);

let testMode;
const callback = text => {
  if (testMode) {
    console.log(`foundSuggestions (testMode): "${text}"`);
  } else {
    console.log(`invoking global.DeviceClient.foundSuggestions("${text}")`);
    //console.log(global.DeviceClient.foundSuggestions.toString());
    global.DeviceClient.foundSuggestions(text);
  }
};

let context;
const initContext = async () => {
  context = await Utils.parse('');
  await initAddressStore(context);
  return context;
};

const initAddressStore = async context => {
  const store = await Stores.create(context, {
    name: 'addresses',
    id: 'addresses',
    schema: Schemas.Address,
    isCollection: true,
    tags: null,
    storageKey: null
  });
  //console.log(store.id);
  global.ShellApi.observeEntity(`{"type": "address", "name": "North Pole"}`);
  global.ShellApi.observeEntity(`{"type": "address", "name": "South Pole"}`);
};

const run = async json => {
  try {
    if (!context) {
      await initContext();
    }
    const composer = new RamSlotComposer();
    await App(composer, context, callback, json);
  } catch (x) {
    console.error(x);
  }
};

// test
global.ShellApi.receiveEntity();


