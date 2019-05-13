/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {fs} from '../../platform/fs-web.js';
import {path} from '../../platform/path-web.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';

describe('loader', function() {
  this.timeout(10000);

  const testDir = 'test-output';
  before(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
  });

  it('correctly loads Thing as a dependency', async () => {
    const loader = new Loader();
    const schemaString = await loader.loadResource('http://schema.org/Product');
    const manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/Product'});
    assert.equal(manifest.schemas.Product.fields.description.type, 'Text');
  });

  it('can read a schema.org schema that aliases another type', async () => {
    const loader = new Loader();
    const schemaString = await loader.loadResource('http://schema.org/Restaurant');
    const manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/Restaurant'});
    assert.equal(manifest.schemas.Restaurant.fields.servesCuisine.type, 'Text');
  });

  it('can read a schema.org schema with multiple inheritance', async () => {
    const loader = new Loader();
    const schemaString = await loader.loadResource('http://schema.org/LocalBusiness');
    const manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/LocalBusiness'});
    assert.equal(manifest.schemas.LocalBusiness.fields.duns.type, 'Text');
    assert.equal(manifest.schemas.LocalBusiness.fields.branchCode.type, 'Text');
  });

  it('loads a text file', async () => {
    const data = 'text file data';
    const target = path.join('test-output', 'loader-text');
    fs.writeFileSync(target, new Uint8Array(Buffer.from(data)));

    const loader = new Loader();
    const text = await loader.loadResource(target);
    assert.equal(typeof text, 'string');
    assert.equal(text, data);
  });

  it('loads a binary file', async () => {
    const data = new Uint8Array([67, 201, 129, 0, 52]);
    const target = path.join('test-output', 'loader-binary');
    fs.writeFileSync(target, data);

    const loader = new Loader();
    const buffer = await loader.loadBinary(target);
    assert.instanceOf(buffer, ArrayBuffer);
    assert.deepEqual(new Uint8Array(buffer), data);
  });

  it('loads a binary URL', async () => {
    const loader = new Loader();
    const buffer = await loader.loadBinary('http://schema.org/Thing');
    assert.instanceOf(buffer, ArrayBuffer);
    assert.isAbove(buffer.byteLength, 0);
  });
});
