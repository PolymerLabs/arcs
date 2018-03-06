/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import firebase from '../components/firebase.4.2.0.js';

//let version = typeof Arcs === 'undefined' || !Arcs.version ? '/' : Arcs.version.replace(/\./g, '_');
const db_version = '0_3_beta_3';

const firebaseConfig = {
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

const _db = firebase.initializeApp(firebaseConfig/*, 'arcs-storage'*/).database();
const db = _db.ref(db_version);

/* for debugging only */
db.dump = () => db.once('value').then(snap => console.log(db.data = snap.val()));

window._db = _db;
window.db = db;

export {
  firebase as firebase,
  _db as database,
  db,
  db_version as version
};
