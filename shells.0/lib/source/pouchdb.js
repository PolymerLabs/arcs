import PouchDB from 'pouchdb';
import PouchDbMemory from 'pouchdb-adapter-memory';
import PouchDbDebug from 'pouchdb-debug';
window.PouchDB = {PouchDB, PouchDbMemory, PouchDbDebug};