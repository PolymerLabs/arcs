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
import fs from 'fs';
import path from 'path';
import {Runtime} from '../runtime/runtime.js';
import {Manifest} from '../runtime/manifest.js';

const opts = minimist(process.argv.slice(2), {
  string: ['outdir', 'outfile'],
  alias: {d: 'outdir', f: 'outfile'},
  default: {outdir: '.'}
});

if (opts.help || opts._.length === 0) {
  console.log(`
Usage
  $ tools/sigh manifest2json [options] [file ...]

Description
  Serializes manifests.

Options
  --outdir, -d  output directory; defaults to '.'
  --outfile, -f output filename; if omitted, generated from the manifest name
  --help        usage info
`);
  process.exit(0);
}

if (opts._.some((file) => !file.endsWith('.arcs'))) {
  console.error(`Only Arcs manifests ('*.arcs') are allowed.`);
  process.exit(1);
}

/** Format the name of the output file */
function outputName(baseName: string): string {
  return baseName.replace(/\.arcs$/, '.json');
}

/** Extract JSON serializations from manifest */
function toLiteral(manifest: Manifest): object {
  const lit = {};
  lit['particles'] = manifest.particles.map(p => p.toLiteral());
  lit['schemas'] = Object.values(manifest.schemas).map(s => s.toLiteral());
  return lit;
}

/** Write file serializations for each input file */
async function processFile(src: string) {
  if (!fs.existsSync(src)) {
    throw new Error(`File not found: ${src}`);
  }

  const outName = opts.outfile || outputName(path.basename(src));
  const outPath = path.join(opts.outdir, outName);
  console.log(outPath);

  const manifest: Manifest = await Runtime.parseFile(src);
  if (manifest.errors.length) {
    return;
  }

  const outFile = fs.openSync(outPath, 'w');
  fs.writeSync(outFile, JSON.stringify(toLiteral(manifest)));
  fs.closeSync(outFile);
}

async function go() {
  try {
    Runtime.init('../..');
    fs.mkdirSync(opts.outdir, {recursive: true});
    opts._.forEach(await processFile);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}

void go();

