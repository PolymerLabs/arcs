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

const opts = minimist(process.argv.slice(2), {
  string: ['outdir', 'outfile'],
  alias: {d: 'outdir', f: 'outfile'},
  default: {outdir: '.'}
});

if (opts.help || opts._.length === 0) {
  console.log(`
Usage
  $ tools/sigh manifest2proto [options] [file ...]

Description
  Generates protobuf serialization of manifests.

Options
  --outdir, -d  output directory; defaults to '.'
  --outfile, -f output filename; if ommitted, generated from the manifest name
  --help        usage info
`);
  process.exit(0);
}

if (opts._.some((file) => !file.endsWith('.arcs'))) {
  console.error(`Only Arcs manifests ('*.arcs') allowed.`);
  process.exit(1);
}

async function go() {
  try {
    console.log('do nothing');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}

void go();

