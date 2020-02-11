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
import 'https://$particles/Notification/Notification.arcs'
import 'https://$particles/Tutorial/Kotlin/1_HelloWorld/HelloWorld.arcs'
`;

let bus;
let send;

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
        case 'pec':
          break;
        default:
          echo(json);
          break;
      }
    }
  };
};

const echo = json => {
  const data = JSON.parse(json);
  const formatted = JSON.stringify(data, null, '  ');
  const simple = JSON.stringify(data);
  document.body.appendChild(Object.assign(document.createElement('pre'), {
    style: 'padding: 8px; border: 1px solid silver; margin: 8px; overflow-x: hidden;',
    textContent: formatted,
    title: simple.replace(/"/g, '\'')
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
  const notificationTest = () => {
    // spawn an arc
    send({message: 'runArc', arcId: 'pipe-notification-test', modality: 'dom', recipe: 'Notification'});
  };
  //
  const parseTest = () => {
    // parse manifest content
    send({message: 'parse', id: 'content-parse', content: `import 'https://$particles/PipeApps/PipeApps.arcs'`});
    // parse manifest file
    send({message: 'parse', id: 'path-parse', path: `https://$particles/PipeApps/PipeApps.arcs`});
  };
  //
  const wasmTest = () => {
    // spawn an arc using WASM particle
    send({message: 'runArc', arcId: 'wasm-test', modality: 'dom', recipe: 'HelloWorldRecipe'});
  };
  //
  const serialRunArcTest = () => {
    // async `runArc` commands are performed serially
    send({message: 'runArc', arcId: 'pipe-notification-test1', modality: 'dom', recipe: 'Notification'});
    send({message: 'runArc', arcId: 'pipe-notification-test2', modality: 'dom', recipe: 'Notification'});
    send({message: 'runArc', arcId: 'pipe-notification-test3', modality: 'dom', recipe: 'Notification'});
  };
  //
  // perform tests
  enqueue([
    notificationTest,
    wasmTest,
    parseTest,
    serialRunArcTest
  ], 500);
};
