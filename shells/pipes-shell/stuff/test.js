const localdown = require('localdown');
const PouchDB = require('pouchdb-core')
  .plugin(require('pouchdb-adapter-leveldb-core'))
  //.plugin(require('pouchdb-adapter-http'))
  //.plugin(require('pouchdb-mapreduce'))
  //.plugin(require('pouchdb-replication'))
  ;
