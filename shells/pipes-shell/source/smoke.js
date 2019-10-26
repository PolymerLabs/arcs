/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const smokeTest = async bus => {
  const send = envelope => bus.receive(envelope);
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
  const runArcTest = () => {
    // create an arc and instantiate a recipe from the context
    send({message: 'runArc', arcId: 'smoke-test-run-arc', recipe: `Notification`});
    // create an arc and instantiate a recipe from a full path
    send({message: 'runArc', arcId: 'smoke-test-run-arc-path', recipe: `https://$particles/Notification/Notification.arcs|Notification`});
  };
  //
  enqueue([
    ingestionTest,
    autofillTest,
    notificationTest,
    parseTest,
    runArcTest
  ], 500);
};
