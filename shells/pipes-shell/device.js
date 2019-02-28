import {SyntheticStores} from '../lib/synthetic-stores.js';
import {Context} from './context.js';
import {Pipe} from './pipe.js';

// TODO(sjmiles): why not automatic?
SyntheticStores.init();

let userContext;
let client;
let testMode;

export const DeviceApiFactory = (storage, deviceClient) => {
  client = deviceClient;
  userContext = new Context(storage);
  return {
    receiveEntity(json) {
      console.log('received entity...');
      receiveJsonEntity(json);
      return true;
    },
    observeEntity(json) {
      console.log('observing entity...');
      observeJsonEntity(json);
      return true;
    }
  };
};

const callback = text => {
  if (testMode) {
    console.log(`foundSuggestions (testMode): "${text}"`);
  } else {
    console.warn(`invoking DeviceClient.foundSuggestions("${text}")`);
    if (client) {
      client.foundSuggestions(text);
    }
  }
};

const receiveJsonEntity = async json => {
  try {
    testMode = !json;
    if (userContext.pipesArc) {
      return await Pipe.receiveEntity(userContext.context, callback, json);
    }
  } catch (x) {
    console.error(x);
  }
};

const observeJsonEntity = async json => {
  Pipe.observeEntity(userContext.entityStore, json);
};
