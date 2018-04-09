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
import firebase from '../components/firebase.4.2.0.js';

// arc data is under this child node on database root
const version = '0_4';

// server particulars
const serverName = `arcs-storage.firebaseio.com`;
const apiKey = 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8';

// arc storage
const storageKey = `firebase://${serverName}/${apiKey}/${version}`;

// firebase config
const config = {
  apiKey,
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: `https://${serverName}`,
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

// firebase app
const app = firebase.initializeApp(config/*, 'arcs-storage'*/);
// firebase database
const database = app.database();
const db = database.ref(version);
// firebase storage
const storage = app.storage();


// for debugging only
db.dump = () => db.once('value').then(snap => console.log(db.data = snap.val()));

// exportables
const Firebase = {
  version,
  firebase,
  database,
  db,
  storage,
  storageKey
};

// export as globals
window.Firebase = Firebase;
window._db = database;
window.db = db;

// export as module
export default Firebase;
