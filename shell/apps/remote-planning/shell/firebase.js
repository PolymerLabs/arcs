/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {firebase} from '../../../../build/runtime/firebase.js';

const config = {
  // arc data is under this child node on database root
  version: '0_5_0-alpha',
  server: 'arcs-storage.firebaseio.com',
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

const storageKey = `firebase://${config.server}/${config.apiKey}/${config.version}`;
const app = firebase.initializeApp(config);
const database = app.database();
const db = database.ref(config.version);
const storage = app.storage();

// collected stuff
const Firebase = {
  version: config.version,
  firebase,
  database,
  db,
  storage,
  storageKey
};

// export as module
export {Firebase};
