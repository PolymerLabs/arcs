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
import sqlite3 from 'sqlite3';

const opts = minimist(process.argv.slice(2), {
  string: ['databaseFile'],
  alias: {db: 'databaseFile'},
  default: {}
});

if (opts.help || opts.db == null) {
  console.log(`
Usage
  $ tools/sigh dbDump [options]

Description
  Dump a description of the contents of a Kotlin sqlite3 arcs database.

Options
  --databaseFile, -db      database to dump
  --help                   usage info
`);
  process.exit(0);
}

async function main() {
}

void main();