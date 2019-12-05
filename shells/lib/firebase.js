/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {firebase} from '../../concrete-storage/firebase.js';

const config = {
  server: 'arcs-storage.firebaseio.com',
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

// firebase app
const app = firebase && firebase.initializeApp(config, 'images');
// firebase database
const database = app && app.database();
// firebase storage (for file upload, e.g.)
const storage = app && app.storage();

export {
  firebase,
  app,
  database,
  storage
};


