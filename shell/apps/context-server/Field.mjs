import firebase from '../../../node_modules/firebase';
//console.log(firebase);

const config = {
  // arc data is under this child node on database root
  version: '0_4_1-alpha',
  server: 'arcs-storage.firebaseio.com',
  apiKey: 'AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8',
  authDomain: 'arcs-storage.firebaseapp.com',
  databaseURL: 'https://arcs-storage.firebaseio.com',
  projectId: 'arcs-storage',
  storageBucket: 'arcs-storage.appspot.com',
  messagingSenderId: '779656349412'
};

// firebase app
const app = firebase.initializeApp(config);
// firebase database
const database = app.database();
const db = database.ref(config.version);

import {FbGraph} from './FbGraph.mjs';
//console.log(FbGraph);

// (async () => {
//   const snap = await db.once('value');
//   console.log(snap.val());
// })();

const {Field} = FbGraph(db);
//console.log(Field);

export {Field};

