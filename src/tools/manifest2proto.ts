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
import protobuf from 'protobufjs';

const rootNamespace = protobuf.loadSync('./java/arcs/core/data/manifest.proto');
const manifestProto = rootNamespace.lookupType('arcs.Manifest');

export async function serialize2proto(path: string): Promise<Uint8Array> {
  const manifest = await Runtime.parseFile(path);

  // This is a super early sketch of manifest serialization, just for demo purposes.
  const payload = {
    recipes: manifest.recipes.map(r => ({
      name: r.name,
      particles: r.particles.map(p => p.name),
      handles: r.handles.map(h => h.localName).filter(h => !!h /* skip immediate handles */),
    }))
  };

  const errMsg = manifestProto.verify(payload);
  if (errMsg) throw Error(errMsg);

  const message = manifestProto.create(payload);

  return manifestProto.encode(message).finish();
}

const opts = minimist(process.argv.slice(2), {
  string: ['outdir', 'outfile'],
  alias: {d: 'outdir', f: 'outfile'},
  default: {outdir: '.'}
});

if (opts.help || opts._.length === 0) {
  console.log(`
Usage
  $ tools/sigh manifest2proto [options] path/to/manifest.arcs

Description
  Serializes manifests to a protobuf file. 

Options
  --outfile, -f output filename; required
  --outdir, -d  output directory; defaults to '.'
  --help        usage info
`);
  process.exit(0);
}

if (!opts.outfile) {
  console.error(`Parameter --outfile is required.`);
  process.exit(1);
}

// TODO(alxr): Support proto generation from multiple manifests
if (opts._.length > 1) {
  console.error(`Only a single manifest is allowed`);
  process.exit(1);
}

if (opts._.some((file) => !file.endsWith('.arcs'))) {
  console.error(`Only Arcs manifests ('*.arcs') are allowed.`);
  process.exit(1);
}

async function main() {
  try {
    Runtime.init('../..');
    fs.mkdirSync(opts.outdir, {recursive: true});

    const buffer = await serialize2proto(opts._[0]);

    const outPath = path.join(opts.outdir, opts.outfile);
    console.log(outPath);

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, Buffer.from(buffer));
    fs.closeSync(outFile);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

void main();
