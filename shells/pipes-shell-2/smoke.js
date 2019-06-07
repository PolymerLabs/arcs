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
  //
  const captureData = () => {
    // capture some data for later
    bus.receive({message: 'capture', entity: {type: 'artist', name: 'Taylor Swift', source: 'com.spotify.music'}});
    bus.receive({message: 'capture', entity: {type: 'artist', name: 'Metallica', source: 'com.spotify.music'}});
    bus.receive({message: 'capture', entity: {type: 'address', name: 'North Pole', source: 'com.google.android.apps.maps'}});
  };
  //
  const ingestEntity = () => {
    // ingest entity and instantiate the first suggestion
    bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'artist', name: 'Taylor Swift'}});
  };
  //
  const spotifyAutofill = () => {
    // request autofill for com.spotify.music
    bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'autofill', source: 'com.spotify.music'}});
  };
  //
  const mapsAutofill = () => {
    // request autofill for com.google.android.apps.maps
    bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'autofill', source: 'com.google.android.apps.maps'}});
  };
  //
  const tapToCaption = () => {
    // request tap-to-caption resolution for 'Dogs are awesome'
    bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'caption', name: 'Dogs are awesome'}});
  };
  //
  const longRunning = () => {
    // get continual updates from a long-running arc
    bus.receive({message: 'ingest', modality: 'dom', recipe: 'UpdateMe'});
  };
  //
  // example fancy client (driver)
  bus.client.channels = {};
  bus.client.receive = json => {
    const msg = JSON.parse(json);
    const channel = bus.client.channels[msg.tid];
    if (channel) {
      channel(msg);
    }
  };
  const customArc = () => {
    // custom
    const tid = bus.receive({message: 'spawn'});
    bus.receive({tid, message: 'ingest', entity: {type: 'artist', name: 'Taylor Swift'}});
      bus.client.channels[tid] = (msg) => {
      if (msg.message === 'suggestions') {
        // do something
      }
    };
  };
  //
  const enqueue = tests => {
    console.warn(`busish: starting new task...(remaining ${tests.length})`);
    (tests.shift())();
    if (tests.length) {
      // wait a bit before starting the test,
      // to simulate (more) serial task requests
      // and make it possible to read the console.
      // (should work in parallel also)
      setTimeout(() => enqueue(tests), 3000);
    }
  };
  //
  enqueue([
    captureData,
    ingestEntity,
    spotifyAutofill,
    mapsAutofill,
    tapToCaption,
    longRunning,
    customArc
  ]);
};
