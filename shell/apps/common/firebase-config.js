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

const config = (() => {
  const testFirebaseKey = (new URL(document.location)).searchParams.get('testFirebaseKey');
  if (!testFirebaseKey) {
    return {
      // arc data is under this child node on database root
      version: '0_4-alpha',
      server: 'arcs-storage.firebaseio.com',
      apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
      authDomain: 'arcs-storage.firebaseapp.com',
      databaseURL: 'https://arcs-storage.firebaseio.com',
      projectId: 'arcs-storage',
      storageBucket: 'arcs-storage.appspot.com',
      messagingSenderId: '779656349412'
    };
  } else {
    return {
      // arc data is under this child node on database root
      version: testFirebaseKey,
      server: 'arcs-storage-test.firebaseio.com',
      apiKey: 'AIzaSyCbauC2RwA8Ao87tKV4Vzq6qIZiytpo4ws',
      authDomain: 'arcs-storage-test.firebaseapp.com',
      databaseURL: 'https://arcs-storage-test.firebaseio.com',
      projectId: 'arcs-storage-test',
      storageBucket: 'arcs-storage-test.appspot.com',
      messagingSenderId: '419218095277'
    };
  }
})();

const storageKey = `firebase://${config.server}/${config.apiKey}/${config.version}`;

// firebase app
const app = firebase.initializeApp(config);
// firebase database
const database = app.database();
const db = database.ref(config.version);
// firebase storage
const storage = app.storage();

// console tools
db.dump = () => db.once('value').then(snap => console.log(db.data = snap.val()));
db.get = async path => {
  const snap = await db.child(path).once('value');
  const value = snap.val();
  console.log(value);
  return value;
};
db.newUser = name => {
  const user = {info: {name}};
  return db.child('users').push(user).key;
};

// fill in existing global reference if necessary
const Firebase = window.Firebase || {};

// exportables
Object.assign(Firebase, {
  version: config.version,
  firebase,
  database,
  db,
  storage,
  storageKey
});

// export as globals
window.Firebase = Firebase;
window._db = database;
window.db = db;

// export as module
export default Firebase;
