/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';
import PouchDbDebug from 'pouchdb-debug';
window.PouchDB = {PouchDB, PouchDbMemory, PouchDbDebug};
