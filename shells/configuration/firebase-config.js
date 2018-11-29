/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Const} from './constants.js';

const config = {
  server: 'arcs-storage.firebaseio.com',
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

const configure = firebase => {
  // api
  Firebase.firebase = firebase;
  // firebase app
  Firebase.app = firebase.initializeApp(config);
  // firebase database
  Firebase.database = Firebase.app.database();
  // version node
  Firebase.db = Firebase.database.ref(Const.version);
  // firebase storage (for file upload, e.g.)
  Firebase.storage = Firebase.app.storage();
  // no more configuring
  Firebase.configure = () => null;
};

export const Firebase = {
  config,
  configure,
  app: null,
  database: null,
  db: null
};


