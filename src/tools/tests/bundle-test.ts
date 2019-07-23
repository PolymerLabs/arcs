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
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/a/a.arcs')), [
      {filePath: 'src/tools/tests/test-data/a/a.arcs', bundlePath: 'a.arcs', entryPoint: true},
      {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a.js', entryPoint: false},
    ]);
  });
  it('bundles store json files', async () => {
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/b/b.arcs')), [
      {filePath: 'src/tools/tests/test-data/b/b.arcs', bundlePath: 'b.arcs', entryPoint: true},
      {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b.json', entryPoint: false},
    ]);
  });
  it('handles manifest imports', async () => {
    assert.deepEqual(relativize(await bundleListing('src/tools/tests/test-data/c/c.arcs')), [
      {filePath: 'src/tools/tests/test-data/a/a.arcs', bundlePath: 'a/a.arcs', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a/a.js', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/b/b.arcs', bundlePath: 'b/b.arcs', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b/b.json', entryPoint: false},
      {filePath: 'src/tools/tests/test-data/c/c.arcs', bundlePath: 'c/c.arcs', entryPoint: true},
    ]);
  });
  it('accepts multiple entry points', async () => {
    assert.deepEqual(
        relativize(await bundleListing(
            'src/tools/tests/test-data/a/a.arcs',
            'src/tools/tests/test-data/b/b.arcs')),
        [
          {filePath: 'src/tools/tests/test-data/a/a.arcs', bundlePath: 'a/a.arcs', entryPoint: true},
          {filePath: 'src/tools/tests/test-data/a/a.js', bundlePath: 'a/a.js', entryPoint: false},
          {filePath: 'src/tools/tests/test-data/b/b.arcs', bundlePath: 'b/b.arcs', entryPoint: true},
          {filePath: 'src/tools/tests/test-data/b/b.json', bundlePath: 'b/b.json', entryPoint: false},
        ]
    );
  });
  it('fails for a non existent manifest', done => {
    bundle(['src/tools/tests/test-data/no-such-manifest.recipes'], 'test-output/bundle/nope.zip', false)
        .then(_ => assert.fail('should have failed'))
        .catch(e => {
          assert.include(e.message, 'no such file');
          assert.include(e.message, 'no-such-manifest.recipes');
          done();
        });
  });
  it('fails for a syntax error', done => {
    bundle(['src/tools/tests/test-data/invalid/syntax-problem.arcs'], 'test-output/bundle/nope.zip', false)
        .then(_ => assert.fail('should have failed'))
        .catch(e => {
          assert.include(e.message, 'Parse error');
          assert.include(e.message, 'schema thing');
          assert.include(e.message, 'Expected "*" or an uppercase identifier');
          done();
        });
  });
  it('fails for a non existent file reference', done => {
    bundle(['src/tools/tests/test-data/invalid/reference-problem.arcs'], 'test-output/bundle/nope.zip', false)
        .then(_ => assert.fail('should have failed'))
        .catch(e => {
          assert.include(e.message, 'no such file');
          assert.include(e.message, 'no-such-particle.js');
          done();
        });
  });
  it('fails for a top-level __bundle_entry.arcs file', done => {
    bundle(['src/tools/tests/test-data/invalid/__bundle_entry.arcs'], 'test-output/bundle/nope.zip', false)
        .then(_ => assert.fail('should have failed'))
        .catch(e => {
          assert.include(e.message, `Top-level '__bundle_entry.arcs' file found`);
          done();
        });
  });
  it('bundles Products demo', async () => {
    await bundle(['src/runtime/tests/artifacts/Products/Products.recipes'], 'test-output/bundle/products.zip', false);
    const data = fs.readFileSync('test-output/bundle/products.zip');
    const zip = await JSZip.loadAsync(data);

    assert.hasAllKeys(zip.files, [
      'Common/List.manifest',
      'Common/Multiplexer.manifest',
      'Common/source/List.js',
      'Common/source/Multiplexer.js',
      'Common/source/TileList.js',
      'Demo/Browse.manifest',
      'Demo/ClairesWishlist.manifest',
      'Demo/people.json',
      'Demo/products.json',
      'Demo/wishlist.json',
      'People/Person.schema',
      'Products/Gifts.recipes',
      'Products/Interests.recipes',
      'Products/Manufacturer.recipes',
      'Products/Product.schema',
      'Products/Products.recipes',
      'Products/Recommend.recipes',
      'Products/ShowProducts.recipes',
      'Products/source/AlsoOn.js',
      'Products/source/AlternateShipping.js',
      'Products/source/Arrivinator.js',
      'Products/source/Chooser.js',
      'Products/source/GiftList.js',
      'Products/source/Interests.js',
      'Products/source/ManufacturerInfo.js',
      'Products/source/Recommend.js',
      'Products/source/ShowProduct.js',
      'Things/Thing.schema',
      '__bundle_entry.arcs'
    ]);

    // Sanity check.
    assert.include(
      await zip.file('Products/Recommend.recipes').async('text'),
      `particle Recommend in 'source/Recommend.js'`
    );

    assert.strictEqual(
        await zip.file('__bundle_entry.arcs').async('text'),
        `import 'Products/Products.recipes'\n`);
  });
});
