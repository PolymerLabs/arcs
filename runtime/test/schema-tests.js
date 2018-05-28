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
import {StubLoader} from '../testing/stub-loader.js';
import {Manifest} from '../manifest.js';
import {Schema} from '../schema.js';

describe('schema', function() {
  let loader = new StubLoader({
    'Product.schema': `
        import './shell/artifacts/Things/Thing.schema'
        schema Product extends Thing
          Text category
          Text seller
          Text price
          Number shipDays
          Boolean isReal
          Object brand

        schema Animal extends Thing
          Boolean isReal

        schema Person
          Text name
          Text surname
          Number price

        schema AlienLife
          Boolean isBasedOnDna
        `
  });

  it('schemas load recursively', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let schema = manifest.findSchemaByName('Product');
    assert.deepEqual(schema.fields, {description: 'Text', image: 'URL', category: 'Text',
                                     price: 'Text', seller: 'Text', shipDays: 'Number',
                                     url: 'URL', identifier: 'Text', isReal: 'Boolean',
                                     brand: 'Object', name: 'Text'});
    assert.equal(schema.name, 'Product');
    assert.include(schema.names, 'Thing');
  });

  it('constructs an appropriate entity subclass', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
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
    let manifest = await Manifest.load('Product.schema', loader);
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
    let manifest = await Manifest.load('Product.schema', loader);
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
    let manifest = await Manifest.load('Product.schema', loader);
    let Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({sku: 'sku'}); }, 'not in schema');

    let product = new Product({});
    assert.throws(() => { product.rawData.sku = 'sku'; }, 'not in schema');
    assert.throws(() => { let x = product.rawData.sku; }, 'not in schema');
  });

  it('performs type checking', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({name: 6}); }, TypeError, 'Type mismatch setting field name');
    assert.throws(() => { new Product({url: 7}); }, TypeError, 'Type mismatch setting field url');
    assert.throws(() => { new Product({shipDays: '2'}); }, TypeError, 'Type mismatch setting field shipDays');

    let product = new Product({});
    assert.throws(() => { product.name = 6; }, TypeError, 'Type mismatch setting field name');
    assert.throws(() => { product.url = ['url']; }, TypeError, 'Type mismatch setting field url');
    assert.throws(() => { product.shipDays = {two: 2}; }, TypeError, 'Type mismatch setting field shipDays');
    assert.throws(() => { product.isReal = 1; }, TypeError, 'Type mismatch setting field isReal');

    // Should be able to clear fields.
    assert.doesNotThrow(() => { new Product({name: null, shipDays: undefined}); });
    assert.doesNotThrow(() => { product.image = null; });
    assert.doesNotThrow(() => { product.url = undefined; });
    assert.doesNotThrow(() => { product.isReal = true; });
    assert.deepEqual(product.image, null);
    assert.deepEqual(product.url, undefined);
    assert.deepEqual(product.isReal, true);
  });

  it('makes a copy of the data when cloning', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
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
                            image: 'http://www.example.com/soup.jpg', category: 'Fluidic Food',
                            shipDays: 4});
  });

  it('union types', async function() {
    let manifest = await Manifest.parse(`
      schema Unions
        (Text or Number) u1
        (URL or Object or Boolean) u2`);
    let Unions = manifest.findSchemaByName('Unions').entityClass();
    let unions = new Unions({u1: 'foo', u2: true});
    assert.equal(unions.u1, 'foo');
    assert.equal(unions.u2, true);
    unions.u1 = 45;
    unions.u2 = 'http://bar.org';
    assert.equal(unions.u1, 45);
    assert.equal(unions.u2, 'http://bar.org');
    unions.u2 = {a: 12};
    assert.equal(unions.u2.a, 12);

    unions.u1 = null;
    unions.u2 = undefined;
    assert.equal(unions.u1, null);
    assert.equal(unions.u2, undefined);
    assert.doesNotThrow(() => { new Unions({u1: null, u2: undefined}); });

    assert.throws(() => { new Unions({u1: false}); }, TypeError, 'Type mismatch setting field u1');
    assert.throws(() => { new Unions({u2: 25}); }, TypeError, 'Type mismatch setting field u2');
    assert.throws(() => { unions.u1 = {a: 12}; }, TypeError, 'Type mismatch setting field u1');
    assert.throws(() => { unions.u2 = 25; }, TypeError, 'Type mismatch setting field u2');
  });

  it('tuple types', async function() {
    let manifest = await Manifest.parse(`
      schema Tuples
        (Text, Number) t1
        (URL, Object, Boolean) t2`);
    let Tuples = manifest.findSchemaByName('Tuples').entityClass();
    let tuples = new Tuples({t1: ['foo', 55], t2: [null, undefined, true]});
    assert.deepEqual(tuples.t1, ['foo', 55]);
    assert.deepEqual(tuples.t2, [null, undefined, true]);
    tuples.t1 = ['bar', 66];
    tuples.t2 = ['http://bar.org', {a: 77}, null];
    assert.deepEqual(tuples.t1, ['bar', 66]);
    assert.deepEqual(tuples.t2, ['http://bar.org', {a: 77}, null]);

    tuples.t1 = null;
    tuples.t2 = undefined;
    assert.equal(tuples.t1, null);
    assert.equal(tuples.t2, undefined);
    assert.doesNotThrow(() => { new Tuples({t1: null, t2: undefined}); });

    assert.throws(() => { new Tuples({t1: 'foo'}); }, TypeError,
                  'Cannot set tuple t1 with non-array value');
    assert.throws(() => { tuples.t2 = {a: 1}; }, TypeError,
                  'Cannot set tuple t2 with non-array value');

    assert.throws(() => { new Tuples({t1: ['foo']}); }, TypeError,
                  'Length mismatch setting tuple t1');
    assert.throws(() => { tuples.t2 = ['url', {}, true, 3]; }, TypeError,
                  'Length mismatch setting tuple t2');

    assert.throws(() => { new Tuples({t1: ['foo', '55']}); }, TypeError,
                  /Type mismatch setting field t1 .* at index 1/);
    assert.throws(() => { tuples.t2 = [12, {}, false]; }, TypeError,
                  /Type mismatch setting field t2 .* at index 0/);

    // Tuple fields should not be accessible as standard Arrays.
    assert.throws(() => { tuples.t1.push(5); }, TypeError, 'Cannot read property');
    assert.throws(() => { tuples.t2.shift(); }, TypeError, 'Cannot read property');
  });

  it('field with a single parenthesised value is a tuple not a union', async function() {
    let manifest = await Manifest.parse(`
      schema SingleValueTuple
        (Number) t`);
    let SingleValueTuple = manifest.findSchemaByName('SingleValueTuple').entityClass();
    let svt = new SingleValueTuple({t: [12]});
    assert.deepEqual(svt.t, [12]);
    svt.t = [34];
    assert.deepEqual(svt.t, [34]);
    assert.throws(() => { new SingleValueTuple({t: 56}); }, TypeError,
                  'Cannot set tuple t with non-array value');
    assert.throws(() => { svt.t = 78; }, TypeError,
                  'Cannot set tuple t with non-array value');
  });

  it('handles schema unions', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Person = manifest.findSchemaByName('Person');
    let Animal = manifest.findSchemaByName('Animal');

    assert.deepEqual(Schema.union(Person, Animal), new Schema({
      names: ['Person', 'Animal', 'Thing'],
      fields: Object.assign({}, Person.fields, Animal.fields)
    }));
  });

  it('handles field type conflict in schema unions', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Person = manifest.findSchemaByName('Person');
    let Product = manifest.findSchemaByName('Product');

    assert.isNull(Schema.union(Person, Product),
      'price fields of different types forbid an union');
  });

  it('handles schema intersection of subtypes', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Thing = manifest.findSchemaByName('Thing');
    let Product = manifest.findSchemaByName('Product');

    assert.deepEqual(Schema.intersect(Product, Thing), Thing);
    assert.deepEqual(Schema.intersect(Thing, Product), Thing);
  });

  it('handles schema intersection for shared supertypes', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Thing = manifest.findSchemaByName('Thing');
    let Product = manifest.findSchemaByName('Product');
    let Animal = manifest.findSchemaByName('Animal');

    assert.deepEqual(Schema.intersect(Animal, Product), new Schema({
      names: ['Thing'],
      fields: Object.assign({}, Thing.fields, {
        isReal: 'Boolean'
      })
    }));
  });

  it('handles schema intersection if no shared supertype and a conflicting field', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Product = manifest.findSchemaByName('Product');
    let Person = manifest.findSchemaByName('Person');
    let intersection = Schema.intersect(Person, Product);

    assert.isDefined(Person.fields.price);
    assert.isDefined(Product.fields.price);
    assert.isFalse(Schema.typesEqual(Person.fields.price, Product.fields.price));
    assert.isUndefined(intersection.fields.price);

    assert.deepEqual(Schema.intersect(Person, Product), new Schema({
      names: [],
      fields: {
        name: 'Text'
      }
    }));
  });

  it('handles empty schema intersection as empty object', async function() {
    let manifest = await Manifest.load('Product.schema', loader);
    let Person = manifest.findSchemaByName('Person');
    let AlienLife = manifest.findSchemaByName('AlienLife');
    assert.deepEqual(Schema.intersect(Person, AlienLife), new Schema({
      names: [],
      fields: {}
    }));
  });
});
