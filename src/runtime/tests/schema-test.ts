/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// These tests use ClassName like variables and run many tests where return values are ignored.
// tslint:disable: variable-name
// tslint:disable: no-unused-expression

import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Reference} from '../reference.js';
import {Schema} from '../schema.js';
import {StubLoader} from '../testing/stub-loader.js';
import {EntityType, ReferenceType} from '../type.js';
import {Entity} from '../entity.js';

// Modifies the schema in-place.
function deleteLocations(schema: Schema): Schema {
  for (const [name, type] of Object.entries(schema.fields)) {
    delete type.location;
  }
  return schema;
}

describe('schema', () => {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').
  let loader: StubLoader;
  before(() => {
    loader = new StubLoader({
      'Product.schema': `
          import './src/runtime/tests/artifacts/Things/Thing.schema'
          schema Product extends Thing
            Text category
            Text seller
            Text price
            Number shipDays
            Boolean isReal

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
  });

  it('schemas load recursively', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const schema = manifest.findSchemaByName('Product');
    assert.strictEqual(schema.name, 'Product');
    assert.include(schema.names, 'Thing');

    const kind = 'schema-primitive';
    const expected = {
      description: {kind, type: 'Text'},
      image: {kind, type: 'URL'},
      category: {kind, type: 'Text'},
      price: {kind, type: 'Text'},
      seller: {kind, type: 'Text'},
      shipDays: {kind, type: 'Number'},
      url: {kind, type: 'URL'},
      identifier: {kind, type: 'Text'},
      isReal: {kind, type: 'Boolean'},
      name: {kind, type: 'Text'}
    };
    assert.deepEqual(deleteLocations(schema).fields, expected);
  });

  it('constructs an appropriate entity subclass', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();
    assert.strictEqual(Product.name, 'Product');
    const product = new Product({name: 'Pickled Chicken Sandwich',
                               description: 'A sandwich with pickles and chicken',
                               image: 'http://www.example.com/pcs.jpg',
                               category: 'Delicious Food', shipDays: 5});
    assert.instanceOf(product, Product);
    assert.strictEqual(product.name, 'Pickled Chicken Sandwich');
    assert.strictEqual(product.description, 'A sandwich with pickles and chicken');
    assert.strictEqual(product.image, 'http://www.example.com/pcs.jpg');
    assert.strictEqual(product.category, 'Delicious Food');
    assert.strictEqual(product.shipDays, 5);
    assert.isUndefined(product.url);
    assert.isUndefined(product.identifier);
    assert.isUndefined(product.seller);
    assert.isUndefined(product.price);
  });

  it('stores a copy of the constructor arguments', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();
    const data: {name: string, category: string, description?: string} = {name: 'Seafood Ice Cream', category: 'Terrible Food'};
    const product = new Product(data);
    data.category = 'whyyyyyy';
    data.description = 'no seriously why';
    assert.strictEqual(product.name, 'Seafood Ice Cream');
    assert.strictEqual(product.category, 'Terrible Food');
    assert.isUndefined(product.description);
  });

  it('has getters for all schema fields', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();

    const product = new Product({
      name: 'Deep Fried Pizza',
      description: 'Pizza, but fried, deeply',
      image: 'http://www.example.com/dfp.jpg',
      url: 'http://www.example.com/dfp.html',
      identifier: 'dfp001',
      category: 'Scottish Food',
      seller: 'The chip shop on the corner',
      price: '$3.50',
      shipDays: 1,
    });

    assert.strictEqual(product.name, 'Deep Fried Pizza');
    assert.strictEqual(product.description, 'Pizza, but fried, deeply');
    assert.strictEqual(product.image, 'http://www.example.com/dfp.jpg');
    assert.strictEqual(product.url, 'http://www.example.com/dfp.html');
    assert.strictEqual(product.identifier, 'dfp001');
    assert.strictEqual(product.category, 'Scottish Food');
    assert.strictEqual(product.seller, 'The chip shop on the corner');
    assert.strictEqual(product.price, '$3.50');
    assert.strictEqual(product.shipDays, 1);
  });

  it('has setters for schema fields only', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({sku: 'sku'}); }, 'not in schema');

    const product = new Product({});
    assert.throws(() => product.sku = 'sku', 'Use the mutate method instead');
    assert.throws(() => Entity.mutate(product, p => p.sku = 'sku'), 'not in schema');
  });

  it('performs type checking', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();
    assert.throws(() => { new Product({name: 6}); }, TypeError, 'Type mismatch setting field name');
    assert.throws(() => { new Product({url: 7}); }, TypeError, 'Type mismatch setting field url');
    assert.throws(() => { new Product({shipDays: '2'}); }, TypeError, 'Type mismatch setting field shipDays');

    const product = new Product({});
    assert.throws(() => Entity.mutate(product, p => p.name = 6), TypeError, 'Type mismatch setting field name');
    assert.throws(() => Entity.mutate(product, p => p.url = ['url']), TypeError, 'Type mismatch setting field url');
    assert.throws(() => Entity.mutate(product, p => p.shipDays = {two: 2}), TypeError, 'Type mismatch setting field shipDays');
    assert.throws(() => Entity.mutate(product, p => p.isReal = 1), TypeError, 'Type mismatch setting field isReal');

    // Should be able to clear fields.
    assert.doesNotThrow(() => new Product({name: null, shipDays: undefined}));
    assert.doesNotThrow(() => Entity.mutate(product, p => p.image = null));
    assert.doesNotThrow(() => Entity.mutate(product, p => p.url = undefined));
    assert.doesNotThrow(() => Entity.mutate(product, p => p.isReal = true));
    assert.deepEqual(product.image, null);
    assert.deepEqual(product.url, undefined);
    assert.deepEqual(product.isReal, true);
  });

  it('makes a copy of the data when cloning', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product').entityClass();

    const product = new Product({name: 'Tomato Soup',
                               description: 'Soup that tastes like tomato',
                               image: 'http://www.example.com/soup.jpg',
                               category: 'Fluidic Food', shipDays: 4});
    const data = Entity.dataClone(product);

    // Mutate product to ensure data has been copied.
    Entity.mutate(product, p => {
      p.name = 'Potato Soup';
      p.category = undefined;
    });
    assert.deepEqual(data, {name: 'Tomato Soup', description: 'Soup that tastes like tomato',
                            image: 'http://www.example.com/soup.jpg', category: 'Fluidic Food',
                            shipDays: 4});
  });

  it('enforces rules when storing union types', async () => {
    const manifest = await Manifest.parse(`
      schema Unions
        (Text or Number) u1
        (URL or Number or Boolean) u2`);
    const Unions = manifest.findSchemaByName('Unions').entityClass();
    const unions = new Unions({u1: 'foo', u2: true});
    assert.strictEqual(unions.u1, 'foo');
    assert.strictEqual(unions.u2, true);
    Entity.mutate(unions, u => {
      u.u1 = 45;
      u.u2 = 'http://bar.org';
    });
    assert.strictEqual(unions.u1, 45);
    assert.strictEqual(unions.u2, 'http://bar.org');
    Entity.mutate(unions, u => {
      u.u2 = 12;
    });
    assert.strictEqual(unions.u2, 12);

    Entity.mutate(unions, u => {
      u.u1 = null;
      u.u2 = undefined;
    });
    assert.isNull(unions.u1);
    assert.isUndefined(unions.u2);
    assert.doesNotThrow(() => { new Unions({u1: null, u2: undefined}); });

    assert.throws(() => { new Unions({u1: false}); }, TypeError, 'Type mismatch setting field u1');
    assert.throws(() => { new Unions({u2: {a: 12}}); }, TypeError, 'Type mismatch setting field u2');
    assert.throws(() => Entity.mutate(unions, u => u.u1 = {a: 12}), TypeError, 'Type mismatch setting field u1');
    assert.throws(() => Entity.mutate(unions, u => u.u2 = {a: 12}), TypeError, 'Type mismatch setting field u2');
  });

  it('enforces rules when storing reference types', async () => {
    const manifest = await Manifest.parse(`
      schema ReferencedOne
        Text foo
      schema ReferencedTwo
        Number bar
      schema References
        Reference<ReferencedOne> one
        Reference<ReferencedTwo> two`);

    const References = manifest.findSchemaByName('References').entityClass();

    const ReferencedOneSchema = manifest.findSchemaByName('ReferencedOne');
    assert.doesNotThrow(() => {
      new References({
        one: new Reference({id: 'test', storageKey: 'test'}, new ReferenceType(new EntityType(ReferencedOneSchema)), null),
        two: null
      });
    });

    assert.throws(() => {
      new References({
        one: null,
        two: new Reference({id: 'test', storageKey: 'test'}, new ReferenceType(new EntityType(ReferencedOneSchema)), null)
      });
    }, TypeError, `Cannot set reference two with value '[object Object]' of mismatched type`);
    assert.throws(() => {
      new References({one: 42, two: null});
    }, TypeError, `Cannot set reference one with non-reference '42'`);
  });

  it('enforces rules when storing collection types', async () => {
    const manifest = await Manifest.parse(`
      schema Collections
        [Reference<Foo {Text value}>] collection
    `);

    const Collections = manifest.findSchemaByName('Collections').entityClass();
    const FooType = EntityType.make(['Foo'], {value: 'Text'});
    const BarType = EntityType.make(['Bar'], {value: 'Text'});
    new Collections({collection: new Set()});
    new Collections({
      collection: new Set([new Reference({id: 'test', storageKey: 'test'}, new ReferenceType(FooType), null)])
    });
    assert.throws(() => {
      new Collections({collection:
        new Set([new Reference({id: 'test', storageKey: 'test'}, new ReferenceType(BarType), null)])
      });
    }, TypeError, `Cannot set reference collection with value '[object Object]' of mismatched type`);
  });

  it('enforces rules when storing tuple types', async () => {
    const manifest = await Manifest.parse(`
      schema Tuples
        (Text, Number) t1
        (URL, Number, Boolean) t2`);
    const Tuples = manifest.findSchemaByName('Tuples').entityClass();
    const tuples = new Tuples({t1: ['foo', 55], t2: [null, undefined, true]});
    assert.deepEqual(tuples.t1, ['foo', 55]);
    assert.deepEqual(tuples.t2, [null, undefined, true]);
    Entity.mutate(tuples, t => {
      t.t1 = ['bar', 66];
      t.t2 = ['http://bar.org', 77, null];
    });
    assert.deepEqual(tuples.t1, ['bar', 66]);
    assert.deepEqual(tuples.t2, ['http://bar.org', 77, null]);

    Entity.mutate(tuples, t => {
      t.t1 = null;
      t.t2 = undefined;
    });
    assert.isNull(tuples.t1);
    assert.isUndefined(tuples.t2);
    assert.doesNotThrow(() => { new Tuples({t1: null, t2: undefined}); });

    assert.throws(() => { new Tuples({t1: 'foo'}); }, TypeError,
                  'Cannot set tuple t1 with non-array value');
    assert.throws(() => Entity.mutate(tuples, t => t.t2 = {a: 1}), TypeError,
                  'Cannot set tuple t2 with non-array value');

    assert.throws(() => { new Tuples({t1: ['foo']}); }, TypeError,
                  'Length mismatch setting tuple t1');
    assert.throws(() => Entity.mutate(tuples, t => t.t2 = ['url', {}, true, 3]), TypeError,
                  'Length mismatch setting tuple t2');

    assert.throws(() => { new Tuples({t1: ['foo', '55']}); }, TypeError,
                  /Type mismatch setting field t1 .* at index 1/);
    assert.throws(() => Entity.mutate(tuples, t => t.t2 = [12, {}, false]), TypeError,
                  /Type mismatch setting field t2 .* at index 0/);

    // Tuple fields should not be accessible as standard Arrays.
    assert.throws(() => { tuples.t1.push(5); }, TypeError, 'Cannot read property');
    assert.throws(() => { tuples.t2.shift(); }, TypeError, 'Cannot read property');
  });

  it('field with a single parenthesised value is a tuple not a union', async () => {
    const manifest = await Manifest.parse(`
      schema SingleValueTuple
        (Number) t`);
    const SingleValueTuple = manifest.findSchemaByName('SingleValueTuple').entityClass();
    const svt = new SingleValueTuple({t: [12]});
    assert.deepEqual(svt.t, [12]);
    Entity.mutate(svt, s => s.t = [34]);
    assert.deepEqual(svt.t, [34]);
    assert.throws(() => { new SingleValueTuple({t: 56}); }, TypeError,
                  'Cannot set tuple t with non-array value');
    assert.throws(() => { Entity.mutate(svt, s => s.t = 78); }, TypeError,
                  'Cannot set tuple t with non-array value');
  });

  it('handles schema unions', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Person = manifest.findSchemaByName('Person');
    const Animal = manifest.findSchemaByName('Animal');

    const fields = {...Person.fields, ...Animal.fields};
    const expected = deleteLocations(new Schema(['Person', 'Animal', 'Thing'], fields));
    const actual = deleteLocations(Schema.union(Person, Animal));
    assert.deepEqual(actual, expected);
  });

  it('handles field type conflict in schema unions', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Person = manifest.findSchemaByName('Person');
    const Product = manifest.findSchemaByName('Product');

    assert.isNull(Schema.union(Person, Product),
      'price fields of different types forbid an union');
  });

  it('handles schema intersection of subtypes', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Thing = manifest.findSchemaByName('Thing');
    const Product = manifest.findSchemaByName('Product');

    assert.deepEqual(Schema.intersect(Product, Thing), Thing);
    assert.deepEqual(Schema.intersect(Thing, Product), Thing);
  });

  it('handles schema intersection for shared supertypes', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Thing = manifest.findSchemaByName('Thing');
    const Product = manifest.findSchemaByName('Product');
    const Animal = manifest.findSchemaByName('Animal');

    const fields = {...Thing.fields, isReal: 'Boolean'};
    const expected = deleteLocations(new Schema(['Thing'], fields));
    const actual = deleteLocations(Schema.intersect(Animal, Product));
    assert.deepEqual(actual, expected);
  });

  it('handles schema intersection if no shared supertype and a conflicting field', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Product = manifest.findSchemaByName('Product');
    const Person = manifest.findSchemaByName('Person');
    const intersection = Schema.intersect(Person, Product);

    assert.isDefined(Person.fields.price);
    assert.isDefined(Product.fields.price);
    assert.isFalse(Schema.typesEqual(Person.fields.price, Product.fields.price));
    assert.isUndefined(intersection.fields.price);

    const expected = deleteLocations(new Schema([], {name: 'Text'}));
    const actual = deleteLocations(Schema.intersect(Person, Product));
    assert.deepEqual(actual, expected);
  });

  it('handles empty schema intersection as empty object', async () => {
    const manifest = await Manifest.load('Product.schema', loader);
    const Person = manifest.findSchemaByName('Person');
    const AlienLife = manifest.findSchemaByName('AlienLife');
    assert.deepEqual(Schema.intersect(Person, AlienLife), new Schema([], {}));
  });

  // Firebase doesn't store empty lists or objects, so we need to
  // handle instantiation of an empty schema from an undefined literal.
  it('handles schema instantiation from undefined spec', async () => {
    const emptySchema = Schema.fromLiteral(undefined);
    assert.isEmpty(emptySchema.fields);
    assert.isEmpty(emptySchema.names);
    assert.strictEqual('* {}', emptySchema.toInlineSchemaString());
  });

  it('handles Bytes fields', async () => {
    const manifest = await Manifest.parse(`
      schema Buffer
        Bytes data`);
    const Buffer = manifest.findSchemaByName('Buffer').entityClass();
    const b1 = new Buffer({data: Uint8Array.from([12, 34, 56])});
    assert.deepEqual(b1.data, Uint8Array.from([12, 34, 56]));
  });

  // A mini integration test for schema aliases, annonymous schemas
  // and type inference for fields.
  it('handles Schema Catalogue syntax', async () => {
    const manifest = await Manifest.parse(`
      alias schema * as Base
        Text name
        Text phoneNumber
        URL website
        
      schema Person extends Base
        Text jobTitle
        Number age
      
      particle P
        in Person {name, age, Bytes custom} person`);

    const particle = manifest.particles[0];
    const connection = particle.handleConnections[0];
    const schema = connection.type.getEntitySchema();

    assert.deepEqual(schema.names, ['Person']);
    assert.hasAllKeys(schema.fields, ['name', 'age', 'custom']);
    assert.strictEqual(schema.fields.name.type, 'Text');
    assert.strictEqual(schema.fields.age.type, 'Number');
    assert.strictEqual(schema.fields.custom.type, 'Bytes');
  });

  it('handles multi named aliased schemas with extensions', async () => {
    const manifest = await Manifest.parse(`
      alias schema Event Occurrence as EventAlias
        Text name
        
      schema Accident extends EventAlias
        Number financialCost
      
      schema Crisis extends Accident`);
    
    const alias = manifest.findSchemaByName('EventAlias');
    assert.deepEqual(alias.names, ['Event', 'Occurrence']);
    assert.deepEqual(Object.keys(alias.fields), ['name']);

    const accident = manifest.findSchemaByName('Accident');
    assert.deepEqual(accident.names, ['Accident', 'Event', 'Occurrence']);
    assert.deepEqual(Object.keys(accident.fields), ['financialCost', 'name']);

    const crisis = manifest.findSchemaByName('Crisis');
    assert.deepEqual(crisis.names, ['Crisis', 'Accident', 'Event', 'Occurrence']);
    assert.deepEqual(Object.keys(crisis.fields), ['financialCost', 'name']);
  });

  it('parses anonymous schemas', async () => {
    const manifest = await Manifest.parse(`alias schema * as X`);
    const schema = manifest.findSchemaByName('X');

    assert.isEmpty(schema.names);
    assert.isEmpty(schema.fields);
  });

  it('parses anonymous inline schemas', async () => {
    const manifest = await Manifest.parse(`
      particle P
        in * {} thing`);

    const particle = manifest.particles[0];
    const connection = particle.handleConnections[0];
    const schema = connection.type.getEntitySchema();

    assert.isEmpty(schema.names);
    assert.isEmpty(schema.fields);
  });
});
