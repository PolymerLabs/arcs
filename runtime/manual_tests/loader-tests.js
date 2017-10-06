/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Loader = require("../loader.js");
const assert = require('chai').assert;
const Manifest = require('../manifest.js');

let loader = new Loader();

describe('loader', function() {
  it('can read a schema.org schema', async () => {
    let schemaString = await loader.loadResource('http://schema.org/Product');
    let manifest = await Manifest.parse(schemaString, {loader, fileName: 'http://schema.org/Product'});
  assert(manifest.schemas.Product.optional.description == 'Text');
  });
});
