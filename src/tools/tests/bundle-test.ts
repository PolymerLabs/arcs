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

import {bundle, bundleListing, BundleEntry} from '../bundle.js';
import {assert} from '../../platform/chai-web.js';

// Bundle listings use absolute paths, but this test perform asserts based on the relative paths
// to be isolated from repo location in the user's file system.
function relativize(listing: BundleEntry[]): BundleEntry[] {
  return listing.map(entry => ({
    filePath: path.relative(process.cwd(), entry.filePath).split(path.sep).join('/'),
    bundlePath: entry.bundlePath,
    entryPoint: entry.entryPoint
  }));
}

describe('Bundle Tool', () => {
  it('bundles particle source files', async () => {
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/a/a.manifest')), [
      {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a.js', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/a/a.manifest', bundlePath: 'a.manifest', entryPoint: true},
    ]);
  });
  it('bundles store json files', async () => {
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/b/b.manifest')), [
      {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b.json', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/b/b.manifest', bundlePath: 'b.manifest', entryPoint: true},
    ]);
  });
  it('handles manifest imports', async () => {
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/c/c.manifest')), [
      {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a/a.js', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/a/a.manifest', bundlePath: 'a/a.manifest', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b/b.json', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/b/b.manifest', bundlePath: 'b/b.manifest', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/c/c.manifest', bundlePath: 'c/c.manifest', entryPoint: true},
    ]);
  });
  it('accepts multiple entry points', async () => {
    assert.deepEqual(
        relativize(await bundleListing(
            'src/tools/tests/test-data/a/a.manifest',
            'src/tools/tests/test-data/b/b.manifest')),
        [
          {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a/a.js', entryPoint: false},
          {filePath: 'src/tools/tests/test-data/a/a.manifest', bundlePath: 'a/a.manifest', entryPoint: true},
          {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b/b.json', entryPoint: false},
          {filePath: 'src/tools/tests/test-data/b/b.manifest', bundlePath: 'b/b.manifest', entryPoint: true},
        ]
    );
  });
  it('bundles Products demo', async () => {
    await bundle(['src/runtime/test/artifacts/Products/Products.recipes'], 'test-output/bundle/products.zip', false);
    const data = fs.readFileSync('test-output/bundle/products.zip');
    const zip = await JSZip.loadAsync(data);

    assert.hasAllKeys(zip.files, [
      'Common/',
      'Common/List.manifest',
      'Common/Multiplexer.manifest',
      'Common/source/',
      'Common/source/List.js',
      'Common/source/Multiplexer.js',
      'Common/source/TileList.js',
      'Demo/',
      'Demo/Browse.manifest',
      'Demo/ClairesWishlist.manifest',
      'Demo/people.json',
      'Demo/products.json',
      'Demo/wishlist.json',
      'People/',
      'People/Person.schema',
      'Products/',
      'Products/Gifts.recipes',
      'Products/Interests.recipes',
      'Products/Manufacturer.recipes',
      'Products/Product.schema',
      'Products/Products.recipes',
      'Products/Recommend.recipes',
      'Products/ShowProducts.recipes',
      'Products/source/',
      'Products/source/AlsoOn.js',
      'Products/source/AlternateShipping.js',
      'Products/source/Arrivinator.js',
      'Products/source/Chooser.js',
      'Products/source/GiftList.js',
      'Products/source/Interests.js',
      'Products/source/ManufacturerInfo.js',
      'Products/source/Recommend.js',
      'Products/source/ShowProduct.js',
      'Things/',
      'Things/Thing.schema',
      'bundle-manifest.mf'
    ]);

    // Sanity check.
    assert.include(
      await zip.file('Products/Recommend.recipes').async('text'),
      `particle Recommend in 'source/Recommend.js'`
    );

    assert.equal(
        await zip.file('bundle-manifest.mf').async('text'),
        'entry-point: Products/Products.recipes\n');
  });
});
