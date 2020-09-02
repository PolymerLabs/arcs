/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

import {Loader} from '../platform/loader.js';
import {Manifest} from '../runtime/manifest.js';
import {SimpleVolatileMemoryProvider} from '../runtime/storage/drivers/volatile.js';

export type BundleEntry = {
  filePath: string,
  bundlePath: string,
  entryPoint: boolean
};

/**
 * @param entryPoints array of paths to Arc manifests to bundle, e.g. ['./feature/awesome.recipes']
 * @param bundleName path to the output bundle, e.g. './awesome.zip'
 * @param verbose whether to print bundled files to stdout
 */
export async function bundle(entryPoints: string[], bundleName: string, verbose: boolean) {
  const listing = await bundleListing(...entryPoints);

  if (listing.some(file => file.bundlePath === '__bundle_entry.arcs')) {
    throw new Error('Error: Top-level \'__bundle_entry.arcs\' file found. Please remove it.');
  }

  if (verbose) {
    console.log('Bundled files:');
    listing.forEach(f => console.log(f.filePath));
  }

  return new Promise(resolve => {
    const dirname = path.dirname(bundleName);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, {recursive: true});
    }
    const archive = new JSZip();
    for (const file of listing) {
      archive.file(
        file.bundlePath,
        fs.readFileSync(file.filePath),
        // Some unpackers have issues with 0-byte files.
        {createFolders: false});
    }
    archive.file('__bundle_entry.arcs', listing
        .filter(f => f.entryPoint)
        .map(f => `import '${f.bundlePath}'\n`)
        .join(''));
    // Don't use {streamFiles: true}.
    // Java ZipInputStream does not accept the data descriptors that it generates.
    archive.generateNodeStream()
        .pipe(fs.createWriteStream(bundleName))
        .on('finish', () => resolve());
  });
}

export async function bundleListing(...entryPoints: string[]): Promise<BundleEntry[]> {
  // Use absolute paths to properly handle navigating up above current working directory.
  entryPoints = entryPoints.map(ep => path.isAbsolute(ep)
      ? ep
      // All the paths handled by Arcs use Web/POSIX separators.
      : path.resolve(process.cwd(), ep).split(path.sep).join('/'));

  const loader = new Loader();
  const memoryProvider = new SimpleVolatileMemoryProvider();
  const entryManifests = await Promise.all(entryPoints.map(ep => Manifest.load(ep, loader, {memoryProvider})));

  const filePathsSet = new Set<string>();
  entryManifests.forEach(m => collectDependencies(m, filePathsSet));
  const filePaths = [...filePathsSet].sort();

  const prefixLengthToSubtract = dirPrefixForSortedPaths(filePaths);
  const entryManifestsFileNames = entryManifests.map(m => m.fileName);

  return filePaths.map(filePath => ({
    filePath,
    bundlePath: filePath.substr(prefixLengthToSubtract),
    entryPoint: entryManifestsFileNames.includes(filePath)
  }));
}

function dirPrefixForSortedPaths(paths: string[]): number {
  const first = paths[0];
  const last = paths[paths.length - 1];
  let prefixLength = 0;
  for (let i = 0; i < Math.min(first.length, last.length); i++) {
    if (first[i] !== last[i]) break;
    if (first[i] === '/') prefixLength = i + 1;
  }
  return prefixLength;
}

function collectDependencies(manifest: Manifest, dependencies: Set<string>) {
  if (!manifest.fileName) {
    throw new Error('Missing filename');
  }
  dependencies.add(manifest.fileName);
  for (const particle of manifest.particles) {
    dependencies.add(particle.implFile);
  }
  for (const store of manifest.stores) {
    if (store.source) {
      dependencies.add(store.source);
    }
  }
  for (const imported of manifest.imports) {
    collectDependencies(imported, dependencies);
  }
}
