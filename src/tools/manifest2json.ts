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
import {ErrorSeverity, Manifest, ManifestError} from '../runtime/manifest.js';

class Serialization {
  particles: object[] = [];
  schemas: object[] = [];

  merge(other: Serialization) {
    this.particles = this.particles.concat(other.particles);
    this.schemas = this.schemas.concat(other.schemas);
  }
}

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
  Serializes manifests to a JSON file. 

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

if (opts._.some((file) => !file.endsWith('.arcs'))) {
  console.error(`Only Arcs manifests ('*.arcs') are allowed.`);
  process.exit(1);
}

/** Extract JSON serializations from manifest. */
function toLiteral(manifest: Manifest): Serialization {
  const lit = new Serialization();
  lit.particles = manifest.particles.map(p => p.toLiteral());
  lit.schemas = Object.values(manifest.schemas).map(s => s.toLiteral());
  return lit;
}

/** Write literals to a file. */
function processFile(literals: Serialization) {
  const outPath = path.join(opts.outdir, opts.outfile);
  console.log(outPath);
  const outFile = fs.openSync(outPath, 'w');
  fs.writeSync(outFile, JSON.stringify(literals));
  fs.closeSync(outFile);
}

/** Parse manifests and aggregate literals into a single object. */
async function aggregateLiterals(srcs: string[]): Promise<Serialization> {
  const aggregate = new Serialization();
  for (const src of srcs) {
    if (!fs.existsSync(src)) {
      throw new Error(`File not found: ${src}`);
    }
    const manifest: Manifest = await Runtime.parseFile(src);
    if (manifest.errors.length) {
      const errMsgs = manifest.errors
        .filter(e => e.severity === ErrorSeverity.Error)
        .map(formatManifestErrors);

      throw new Error(`Problems found in manifest '${src}':\n` +
                      `${errMsgs.join('\n')}`);
    }
    aggregate.merge(toLiteral(manifest));
  }
  return aggregate;
}

/** Converts `ManifestError` into debug string */
function formatManifestErrors(error: ManifestError): string {
  const location = `${error.location.filename}:${error.location.start}:${error.location.end}`;
  return `${error.severity} ${location} ${error.message}`;
}

async function main() {
  try {
    Runtime.init('../..');
    fs.mkdirSync(opts.outdir, {recursive: true});
    const literals = await aggregateLiterals(opts._);
    processFile(literals);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

}

void main();

