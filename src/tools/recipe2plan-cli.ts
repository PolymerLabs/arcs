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
import {recipe2plan, OutputFormat} from './recipe2plan.js';
import {Flags} from '../runtime/flags.js';
import {PATHS} from './paths.oss.js';

const opts = minimist(process.argv.slice(2), {
  string: ['outdir', 'outfile', 'format', 'recipe'],
  boolean: ['quiet'],
  alias: {d: 'outdir', f: 'outfile', q: 'quiet'},
  default: {outdir: '.', format: 'kotlin'}
});

if (opts.help || opts._.length === 0) {
  console.log(`
Usage
  $ tools/sigh recipe2plan [options] path/to/manifest.arcs

Description
  Generates Kotlin plans from recipes in a manifest.

Options
  --outfile, -f  output filename; required
  --outdir, -d  output directory; defaults to '.'
  --format  output format, 'kotlin' or 'proto', defaults to 'kotlin'
  --recipe  a name of the recipe to turn into a plan. If not
            provided all recipes in the manifest will be encoded.
  --policies a name of the manifest file containing policies
  --quiet, -q  suppress log output
  --help        usage info
`);
  process.exit(0);
}

if (!opts.outfile) {
  console.error(`Parameter --outfile is required.`);
  process.exit(1);
}

if (opts._.length > 1) {
  console.error(`Only a single manifest is allowed`);
  process.exit(1);
}

if (opts._.some((file) => !file.endsWith('.arcs'))) {
  console.error(`Only Arcs manifests ('*.arcs') are allowed.`);
  process.exit(1);
}

const outFormat = (() => {
  switch (opts.format.toLowerCase()) {
    case 'kotlin': return OutputFormat.Kotlin;
    case 'proto': return OutputFormat.Proto;
    default:
      console.error(`Only Kotlin and Proto output format is supported.`);
      process.exit(1);
  }
})();

void Flags.withDefaultReferenceMode(async () => {
  try {
    const runtime = new Runtime({rootPath: '../..', urlMap: PATHS});
    fs.mkdirSync(opts.outdir, {recursive: true});

    const manifest = await runtime.parseFile(opts._[0]);
    const policiesManifest =
        opts.policies ? await runtime.parseFile(opts.policies) : null;
    const plans = await recipe2plan(manifest, outFormat, policiesManifest, opts.recipe);

    const outPath = path.join(opts.outdir, opts.outfile);
    if (!opts.quiet) {
      console.log(outPath);
    }

    const outFile = fs.openSync(outPath, 'w');
    fs.writeSync(outFile, plans);
    fs.closeSync(outFile);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
