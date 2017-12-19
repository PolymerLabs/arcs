/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import Loader from '../loader.js';
import Manifest from '../manifest.js';

describe('schema', function() {

  it('schemas load recursively', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let schema = manifest.findSchemaByName('Product');
    assert.deepEqual(schema.normative, {name: 'Text'});
    assert.deepEqual(schema.optional, {description: 'Text', image: 'URL', category: 'Text',
                                       price: 'Text', seller: 'Text', shipDays: 'Number',
                                       url: 'URL', identifier: 'Text', isReal: 'Boolean',
                                       brand: 'Object'});
    assert.equal(schema.name, 'Product');
    assert.equal(schema.parents[0].name, 'Thing');
  });

  it('constructs an appropriate entity subclass', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();
    assert.equal(Product.name, 'Product');
    let product = new Product({name: 'Pickled Chicken Sandwich',
                               description: 'A sandwich with pickles and chicken',
                               image: 'http://www.example.com/pcs.jpg',
                               category: 'Delicious Food', shipDays: 5});
    assert(product instanceof Product);
    assert.equal(product.name, 'Pickled Chicken Sandwich');
    assert.equal(product.description, 'A sandwich with pickles and chicken');
    assert.equal(product.image, 'http://www.example.com/pcs.jpg');
    assert.equal(product.category, 'Delicious Food');
    assert.equal(product.shipDays, 5);
    assert.equal(product.url, undefined);
    assert.equal(product.identifier, undefined);
    assert.equal(product.seller, undefined);
    assert.equal(product.price, undefined);
  });

  it('stores a copy of the constructor arguments', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();
    let data = {name: 'Seafood Ice Cream', category: 'Terrible Food'};
    let product = new Product(data);
    data.category = 'whyyyyyy';
    data.description = 'no seriously why';
    assert.equal(product.name, 'Seafood Ice Cream');
    assert.equal(product.category, 'Terrible Food');
    assert.equal(product.description, undefined);
  });

  it('has accessors for all schema fields', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();

    let product = new Product({});
    product.name = 'Deep Fried Pizza';
    product.description = 'Pizza, but fried, deeply';
    product.image = 'http://www.example.com/dfp.jpg';
    product.url = 'http://www.example.com/dfp.html';
    product.identifier = 'dfp001';
    product.category = 'Scottish Food';
    product.seller = 'The chip shop on the corner';
    product.price = '$3.50';
    product.shipDays = 1;

    assert.equal(product.rawData.name, 'Deep Fried Pizza');
    assert.equal(product.rawData.description, 'Pizza, but fried, deeply');
    assert.equal(product.rawData.image, 'http://www.example.com/dfp.jpg');
    assert.equal(product.rawData.url, 'http://www.example.com/dfp.html');
    assert.equal(product.rawData.identifier, 'dfp001');
    assert.equal(product.rawData.category, 'Scottish Food');
    assert.equal(product.rawData.seller, 'The chip shop on the corner');
    assert.equal(product.rawData.price, '$3.50');
    assert.equal(product.rawData.shipDays, 1);

    assert.equal(product.name, product.rawData.name);
    assert.equal(product.description, product.rawData.description);
    assert.equal(product.image, product.rawData.image);
    assert.equal(product.url, product.rawData.url);
    assert.equal(product.identifier, product.rawData.identifier);
    assert.equal(product.category, product.rawData.category);
    assert.equal(product.seller, product.rawData.seller);
    assert.equal(product.price, product.rawData.price);
    assert.equal(product.shipDays, product.rawData.shipDays);
  });

  it('has accessors for schema fields only', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({sku: 'sku'}) }, 'not in schema');

    let product = new Product({});
    assert.throws(() => { product.rawData.sku = 'sku'; }, 'not in schema');
    assert.throws(() => { let x = product.rawData.sku; }, 'not in schema');
  });

  it('performs type checking', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({name: 6}) }, TypeError);
    assert.throws(() => { new Product({url: 7}) }, TypeError);
    assert.throws(() => { new Product({shipDays: '2'}) }, TypeError);

    let product = new Product({});
    assert.throws(() => { product.name = 6; }, TypeError);
    assert.throws(() => { product.url = ['url']; }, TypeError);
    assert.throws(() => { product.shipDays = {two:2}; }, TypeError);
    assert.throws(() => { product.isReal = 1; }, TypeError);

    // Should be able to clear fields.
    assert.doesNotThrow(() => { new Product({name: null, shipDays: undefined}) });
    assert.doesNotThrow(() => { product.image = null; });
    assert.doesNotThrow(() => { product.url = undefined; });
    assert.doesNotThrow(() => { product.isReal = true; });
    assert.deepEqual(product.image, null);
    assert.deepEqual(product.url, undefined);
    assert.deepEqual(product.isReal, true);
  });

  it('makes a copy of the data when cloning', async function() {
    let manifest = await Manifest.load('./entities/Product.manifest', new Loader());
    let Product = manifest.findSchemaByName('Product').entityClass();

    let product = new Product({name: 'Tomato Soup',
                               description: 'Soup that tastes like tomato',
                               image: 'http://www.example.com/soup.jpg',
                               category: 'Fluidic Food', shipDays: 4});
    let data = product.dataClone();

    // Mutate product to ensure data has been copied.
    product.name = 'Potato Soup';
    product.category = undefined;
    assert.deepEqual(data, {name: 'Tomato Soup', description: 'Soup that tastes like tomato',
                            image: 'http://www.example.com/soup.jpg', url: undefined,
                            identifier: undefined, category: 'Fluidic Food', seller: undefined,
                            price: undefined, shipDays: 4, isReal: undefined,
                            brand: undefined});
  });
});
