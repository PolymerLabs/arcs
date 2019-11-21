/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const defaultManifest = `
// UIBroker/demo particles below here
import 'https://$particles/Pipes/Pipes.arcs'
//import 'https://$particles/Restaurants/Restaurants.arcs'
import 'https://$particles/Notification/Notification.arcs'
`;

let bus, send;

export const createTestDevice = (paths, storage) => {
  return {
    init: _bus => {
      bus = _bus;
      send = envelope => bus.receive(envelope);
    },
    receive: json => {
      const body = JSON.parse(json);
      switch (body.message) {
        case 'ready':
          send({message: 'configure', config: {
            rootPath: paths.root,
            urlMap: paths.map,
            storage,
            manifest: defaultManifest
          }});
          break;
        case 'context':
          smokeTest(bus);
          break;
        default:
          echo(json);
          break;
      }
    }
  };
};

const echo = json => {
  const simple = JSON.stringify(JSON.parse(json));
  document.body.appendChild(Object.assign(document.createElement('pre'), {
    style: 'padding: 8px; border: 1px solid silver; margin: 8px;',
    textContent: json,
    title: simple/*.replace(/\n/g, '')*/.replace(/\"/g, '\'')
  }));
};

const smokeTest = async (bus) => {
  const send = envelope => bus.receive(envelope);
  //
  const enqueue = (tests, delay) => {
    if (tests.length) {
      console.warn(`busish: starting new task...(${tests.length} remaining)`);
      (tests.shift())();
      // wait a bit before starting the test,
      // to simulate (more) serial task requests
      // and make it possible to read the console.
      // (should work in parallel also)
      setTimeout(() => enqueue(tests, delay), delay);
    }
  };
  //
  const enableIngestion = () => {
    // enable 'classic' ingestion
    send({message: 'enableIngestion'});
  };
  //
  const ingestionTest = () => {
    // ingest some data
    send({message: 'ingest', entity: {type: 'person', jsonData: `{"name": "John Hancock"}`}});
  };
  //
  const autofillTest = () => {
    send({message: 'spawn', recipe: 'PersonAutofill'});
  };
  //
  const notificationTest = () => {
    // spawn an arc
    send({message: 'spawn', modality: 'dom', recipe: 'Notification'});
  };
  //
  const parseTest = () => {
    // parse manifest content
    send({message: 'parse', content: `import 'https://$particles/canonical.arcs'`});
    // parse manifest file
    send({message: 'parse', path: `https://$particles/canonical.arcs`});
  };
  //
  const wasmTest = () => {
    // spawn an arc using WASM particle
    send({message: 'spawn', modality: 'dom', recipe: 'HelloWorldRecipe'});
  };
  //
  // perform tests
  enqueue([
    enableIngestion,
    ingestionTest,
    autofillTest,
    //notificationTest,
    //parseTest,
    //wasmTest
  ], 500);
};
