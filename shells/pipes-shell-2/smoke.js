/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const test = async bus => {
  bus.client.channels = {};
  bus.client.receive = json => {
    const msg = JSON.parse(json);
    const channel = bus.client.channels[msg.tid];
    if (channel) {
      channel(msg);
    }
  };
  //
  const instantiateSuggestionFactory = tid => (msg => {
    if (msg.message === 'suggestions') {
      const suggestion = msg.suggestions[0];
      if (suggestion) {
        bus.receive({message: 'ingest', tid, suggestion});
      }
    }
  });
  //
  // wait a bit before starting each message, to simulate (more) serial task requests (works in parallel also)
  const enqueue = tests => {
    console.warn(`busish: starting new task...(remaining ${tests.length})`);
    (tests.shift())();
    if (tests.length) {
      setTimeout(() => enqueue(tests), 3000);
    }
  };
  //
  const tests = [];
  //
  tests.push(() => {
    // capture some data for later
    bus.receive({message: 'capture', entity: {type: 'artist', name: 'Taylor Swift', source: 'com.spotify.music'}});
    bus.receive({message: 'capture', entity: {type: 'artist', name: 'Metallica', source: 'com.spotify.music'}});
    bus.receive({message: 'capture', entity: {type: 'address', name: 'North Pole', source: 'com.google.android.apps.maps'}});
  });
  //
  tests.push(
    () => {
      // ingest entity and instantiate the first suggestion
      bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'artist', name: 'Taylor Swift'}});
    },
    () => {
      // request autofill for com.spotify.music
      bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'autofill', source: 'com.spotify.music'}});
    },
    () => {
      // request autofill for com.google.android.apps.maps
      bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'autofill', source: 'com.google.android.apps.maps'}});
    },
    () => {
      // request tap-to-caption resolution for 'Dogs are awesome'
      bus.receive({message: 'ingest', modality: 'dom', entity: {type: 'caption', name: 'Dogs are awesome'}});
    },
    () => {
      // get continual updates from a long-running arc
      bus.receive({message: 'ingest', modality: 'dom', recipe: 'UpdateMe'});
    }
  );
  //
  // custom
  tests.push(() => {
    const tid = bus.receive({message: 'spawn'});
    bus.receive({tid, message: 'ingest', entity: {type: 'artist', name: 'Taylor Swift'}});
      bus.client.channels[tid] = (msg) => {
      if (msg.message === 'suggestions') {
        // do something
      }
    };
  });
  //
  enqueue(tests);
};
