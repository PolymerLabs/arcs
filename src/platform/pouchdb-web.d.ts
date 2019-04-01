// Export PouchDB type definitions from Node. This module is not actually used in the web deployment, but it's useful to import the Node
// definitions to provide type information in an editor environment.
import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';
import PouchDbDebug from 'pouchdb-debug';
export {PouchDB, PouchDbMemory, PouchDbDebug};
