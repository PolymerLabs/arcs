/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Loader} from '../loader.js';
import {assert} from '../test/chai-web.js';
import {Manifest} from '../manifest.js';

let loader = new Loader();

describe('loader', function() {
  it('correctly loads Thing as a dependency', async () => {
    let schemaString = await loader.loadResource('http://schema.org/Product');
    let manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/Product'});
    assert(manifest.schemas.Product.fields.description == 'Text');
  }).timeout(10000);

  it('can read a schema.org schema that aliases another type', async () => {
    let schemaString = await loader.loadResource('http://schema.org/Restaurant');
    let manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/Restaurant'});
    assert(manifest.schemas.Restaurant.fields.servesCuisine == 'Text');
  }).timeout(10000);

  it('can read a schema.org schema with multiple inheritance', async () => {
    let schemaString = await loader.loadResource('http://schema.org/LocalBusiness');
    let manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/LocalBusiness'});
    assert(manifest.schemas.LocalBusiness.fields.duns == 'Text');
    assert(manifest.schemas.LocalBusiness.fields.branchCode == 'Text');
  }).timeout(10000);
});
