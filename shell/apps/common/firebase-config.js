/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

// firebase runtime (customized by sjmiles@ for import-ability)
import firebase from '../../components/firebase.4.2.0.js';

const version = '0_3_beta_3';

const firebaseConfig = {
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

const app = firebase.initializeApp(firebaseConfig/*, 'arcs-storage'*/);

const database = app.database();
const db = database.ref(version);

const storage = app.storage();

// for debugging only
db.dump = () => db.once('value').then(snap => console.log(db.data = snap.val()));

const Firebase = {
  firebase,
  database,
  db,
  version,
  storage
};

window.Firebase = Firebase;
window._db = database;
window.db = db;

export default Firebase;
