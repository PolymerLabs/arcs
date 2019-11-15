/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// Export PouchDB type definitions from Node. This module is not actually used in the web deployment, but it's useful to import the Node
// definitions to provide type information in an editor environment.

import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';
import PouchDbDebug from 'pouchdb-debug';
export {PouchDB, PouchDbMemory, PouchDbDebug};
