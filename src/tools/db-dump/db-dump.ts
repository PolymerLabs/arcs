/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import minimist from 'minimist';
import {DbDumpDataModel} from './db-dump-data-model';

const opts = minimist(process.argv.slice(2), {
  string: ['databaseFile', 'filter'],
  boolean: ['entities', 'raw', 'types', 'storageKeys', 'collections', 'toplevel', 'entityRefs'],
  alias: {db: 'databaseFile', e: 'entities', r: 'raw', t: 'types', s: 'storageKeys', c: 'collections', er: 'entityRefs'},
  default: {}
});

if (opts.help || opts.databaseFile == null) {
  console.log(`
Usage
  $ tools/sigh dbDump [options]

Description
  Dump a description of the contents of a Kotlin sqlite3 arcs database.

Options
  --databaseFile, --db     database to dump
  --entities, -e           dump information about all entities found
  --toplevel               only dump toplevel (not inline) entities
  --filter                 filter dumped entities by string match [UNIMPLEMENTED]
  --types, -t              dump information about types
  --collections, -c        dump contents of collections
  --storageKeys, -s        dump information about storage keys
  --entityRefs, --er       dump information about entity references
  --raw, -r                dump raw ids and keys rather than processed ones
  --help                   usage info
`);
  process.exit(0);
}

async function main() {
  try {

    const data = new DbDumpDataModel(opts.databaseFile);
    if (opts.types) {
      data.printTypes();
    }

    if (opts.entities) {
      data.printEntities(!opts.raw, opts.toplevel);
    }

    if (opts.storageKeys) {
      data.printStorageKeys(!opts.raw, opts.toplevel);
    }

    if (opts.collections) {
      data.printCollections();
    }

    if (opts.entityRefs) {
      data.printEntityRefs();
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

void main();