/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('chai').assert;
const Loader = require('../loader.js');
const Manifest = require('../manifest.js');

describe('schema', function() {

  it('schemas load recursively', async function() {
    let manifest = await Manifest.load('../entities/Product.manifest', new Loader());
    let schema = manifest.findSchemaByName('Product');
    assert.deepEqual(schema.normative, {name: 'Text'});
    assert.deepEqual(schema.optional, {description: 'Text', image: 'URL', category: 'Text', price: 'Text', seller: 'Text', shipDays: 'Text', url: 'URL'});
    assert.equal(schema.name, "Product");
    assert.equal(schema.parents[0].name, "Thing");
  });

  it('constructs an appropriate entity subclass', async function() {
    let manifest = await Manifest.load('../entities/Product.manifest', new Loader());
    let schema = manifest.findSchemaByName('Product');
    var Product = schema.entityClass();
    assert.equal(Product.name, "Product");
    var product = new Product({name: "Pickled Chicken Sandwich", description: "A sandwich with pickles and chicken"});
    assert(product instanceof Product);
    assert.equal(product.name, "Pickled Chicken Sandwich");
    assert.equal(product.description, "A sandwich with pickles and chicken");
    assert.equal(product.image, undefined);
  })
});
