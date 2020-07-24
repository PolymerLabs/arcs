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
import {Loader} from '../../platform/loader.js';
import {EntityType, ReferenceType} from '../type.js';
import {Entity} from '../entity.js';
import {ConCap} from '../../testing/test-util.js';
import {Flags} from '../flags.js';

// Modifies the schema in-place.
function deleteLocations(schema: Schema): Schema {
  for (const [name, type] of Object.entries(schema.fields)) {
    delete type.location;
  }
  return schema;
}

function getSchemaFromManifest(manifest: Manifest, handleName: string, particleIndex: number = 0): Schema {
  return manifest.particles[particleIndex].handleConnectionMap.get(handleName).type.getEntitySchema();
}

describe('schema', () => {
  // Avoid initialising non-POD variables globally, since they would be constructed even when
  // these tests are not going to be executed (i.e. another test file uses 'only').
  let loader: Loader;
  before(() => {
    loader = new Loader(null, {
      './Product.schema': `
          import './src/runtime/tests/artifacts/Things/Thing.schema'
          schema Product extends Thing
            category: Text
            seller: Text
            price: Text
            shipDays: Number
            isReal: Boolean

          schema Animal extends Thing
            isReal: Boolean

          schema Person
            name: Text
            surname: Text
            price: Number

          schema AlienLife
            isBasedOnDna: Boolean
          `
    });
  });

  it('schemas load recursively', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const schema = manifest.findSchemaByName('Product');
    assert.strictEqual(schema.name, 'Product');
    assert.include(schema.names, 'Thing');

    const kind = 'schema-primitive';
    const expected = {
      description: {kind, refinement: null, type: 'Text', annotations: []},
      image: {kind, refinement: null, type: 'URL', annotations: []},
      category: {kind, refinement: null, type: 'Text', annotations: []},
      price: {kind, refinement: null, type: 'Text', annotations: []},
      seller: {kind, refinement: null, type: 'Text', annotations: []},
      shipDays: {kind, refinement: null, type: 'Number', annotations: []},
      url: {kind, refinement: null, type: 'URL', annotations: []},
      identifier: {kind, refinement: null, type: 'Text', annotations: []},
      isReal: {kind, refinement: null, type: 'Boolean', annotations: []},
      name: {kind, refinement: null, type: 'Text', annotations: []}
    };
    assert.deepEqual(deleteLocations(schema).fields, expected);
  });

  it('constructs an appropriate entity subclass', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);
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
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);
    const data: {name: string, category: string, description?: string} = {name: 'Seafood Ice Cream', category: 'Terrible Food'};
    const product = new Product(data);
    data.category = 'whyyyyyy';
    data.description = 'no seriously why';
    assert.strictEqual(product.name, 'Seafood Ice Cream');
    assert.strictEqual(product.category, 'Terrible Food');
    assert.isUndefined(product.description);
  });

  it('has getters for all schema fields', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);

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
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);
    assert.throws(() => { new Product({sku: 'sku'}); }, 'not in schema');

    const product = new Product({});
    assert.throws(() => product.sku = 'sku', 'Use the mutate method instead');
    assert.throws(() => Entity.mutate(product, p => p.sku = 'sku'), 'not in schema');
  });

  it('performs type checking', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);
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
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = Entity.createEntityClass(manifest.findSchemaByName('Product'), null);

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
        u1: (Text or Number)
        u2: (URL or Number or Boolean)`);
    const Unions = Entity.createEntityClass(manifest.findSchemaByName('Unions'), null);
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
        foo: Text
      schema ReferencedTwo
        bar: Number
      schema References
        one: &ReferencedOne
        two: &ReferencedTwo`);

    const References = Entity.createEntityClass(manifest.findSchemaByName('References'), null);

    const ReferencedOneSchema = manifest.findSchemaByName('ReferencedOne');
    const now = new Date();
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    assert.doesNotThrow(() => {
      new References({
        one: new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(new EntityType(ReferencedOneSchema)), null),
        two: null
      });
    });

    assert.throws(() => {
      new References({
        one: null,
        two: new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(new EntityType(ReferencedOneSchema)), null)
      });
    }, TypeError, `Cannot set reference two with value '[object Object]' of mismatched type`);
    assert.throws(() => {
      new References({one: 42, two: null});
    }, TypeError, `Cannot set reference one with non-reference '42'`);
  });

  it('enforces rules when storing collection types', async () => {
    const manifest = await Manifest.parse(`
      schema Collections
        collection: [&Foo {value: Text}]
    `);

    const Collections = Entity.createEntityClass(manifest.findSchemaByName('Collections'), null);
    const FooType = EntityType.make(['Foo'], {value: 'Text'});
    const BarType = EntityType.make(['Bar'], {value: 'Text'});
    new Collections({collection: new Set()});
    const now = new Date();
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    new Collections({
      collection: new Set([new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(FooType), null)])
    });
    assert.throws(() => {
      new Collections({collection:
        new Set([new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(BarType), null)])
      });
    }, TypeError, `Cannot set reference collection with value '[object Object]' of mismatched type`);
  });

  it('enforces rules when storing tuple types', async () => {
    const manifest = await Manifest.parse(`
      schema Tuples
        t1: (Text, Number)
        t2: (URL, Number, Boolean)`);
    const Tuples = Entity.createEntityClass(manifest.findSchemaByName('Tuples'), null);
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
        t: (Number)`);
    const SingleValueTuple = Entity.createEntityClass(manifest.findSchemaByName('SingleValueTuple'), null);
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
    const manifest = await Manifest.load('./Product.schema', loader);
    const Person = manifest.findSchemaByName('Person');
    const Animal = manifest.findSchemaByName('Animal');

    const fields = {...Person.fields, ...Animal.fields};
    const expected = deleteLocations(new Schema(['Person', 'Animal', 'Thing'], fields));
    const actual = deleteLocations(Schema.union(Person, Animal));
    assert.deepEqual(actual, expected);
  });

  it('handles field type conflict in schema unions', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Person = manifest.findSchemaByName('Person');
    const Product = manifest.findSchemaByName('Product');

    assert.isNull(Schema.union(Person, Product),
      'price fields of different types forbid an union');
  });

  it('handles schema intersection of subtypes', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Thing = manifest.findSchemaByName('Thing');
    const Product = manifest.findSchemaByName('Product');

    assert.deepEqual(Schema.intersect(Product, Thing), Thing);
    assert.deepEqual(Schema.intersect(Thing, Product), Thing);
  });

  it('handles schema intersection for shared supertypes', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Thing = manifest.findSchemaByName('Thing');
    const Product = manifest.findSchemaByName('Product');
    const Animal = manifest.findSchemaByName('Animal');

    const fields = {...Thing.fields, isReal: 'Boolean'};
    const expected = deleteLocations(new Schema(['Thing'], fields));
    const actual = deleteLocations(Schema.intersect(Animal, Product));
    assert.deepEqual(actual, expected);
  });

  it('handles schema intersection if no shared supertype and a conflicting field', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
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
    const manifest = await Manifest.load('./Product.schema', loader);
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
        data: Bytes`);
    const Buffer = Entity.createEntityClass(manifest.findSchemaByName('Buffer'), null);
    const b1 = new Buffer({data: Uint8Array.from([12, 34, 56])});
    assert.deepEqual(b1.data, Uint8Array.from([12, 34, 56]));
  });

  // A mini integration test for schema aliases, annonymous schemas
  // and type inference for fields.
  it('handles Schema Catalogue syntax', async () => {
    const manifest = await Manifest.parse(`
      alias schema * as Base
        name: Text
        phoneNumber: Text
        website: URL

      schema Person extends Base
        jobTitle: Text
        age: Number

      particle P
        person: reads Person {name, age, custom: Bytes}`);

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
        name: Text

      schema Accident extends EventAlias
        financialCost: Number

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
        thing: reads * {}`);

    const particle = manifest.particles[0];
    const connection = particle.handleConnections[0];
    const schema = connection.type.getEntitySchema();

    assert.isEmpty(schema.names);
    assert.isEmpty(schema.fields);
  });

  it('normalize for hash', async () => {
    const manifest = await Manifest.parse(`
      particle P
        empty: reads * {}
        noNames: reads * {msg: Text}
        noFields: reads Foo {}

        orderedA: reads Foo Wiz Bar {x: Number, f: Boolean, s: Text}
        orderedB: reads Wiz Bar Foo {f: Boolean, x: Number, s: Text}

        nestedRefs: reads Foo {num: Number, ref: &Bar {str: Text, inner: &* {val: Boolean}}}
        refCollection: reads * {rc: [&Wiz {str: Text}], z: Number}
        primitiveCollection: reads * {x: [Number], f: [Boolean], s: [Text]}
        tuples: reads Tup {x: (Number, Text)}
    `);
    const getHash = handleName => {
      return manifest.particles[0].getConnectionByName(handleName).type.getEntitySchema().normalizeForHash();
    };

    assert.strictEqual(getHash('empty'), '/');
    assert.strictEqual(getHash('noNames'), '/msg:Text|');
    assert.strictEqual(getHash('noFields'), 'Foo/');

    assert.strictEqual(getHash('orderedA'), 'Bar Foo Wiz/f:Boolean|s:Text|x:Number|');
    assert.strictEqual(getHash('orderedA'), getHash('orderedB'));

    assert.strictEqual(getHash('nestedRefs'), 'Foo/num:Number|ref:&(Bar/inner:&(/val:Boolean|)str:Text|)');
    assert.strictEqual(getHash('refCollection'), '/rc:[&(Wiz/str:Text|)]z:Number|');
    assert.strictEqual(getHash('primitiveCollection'), '/f:[Boolean]s:[Text]x:[Number]');
    assert.strictEqual(getHash('tuples'), 'Tup/x:(Number|Text)');
  });
  it('tests univariate schema level refinements are propagated to field level', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a < 0], b: Number, c: Number} [a < 10]
        schema2: reads Y {a: Number [a < 0 and a < 10], b: Number, c: Number}
    `);
    const schema1 = deleteLocations(getSchemaFromManifest(manifest, 'schema1'));
    const schema2 = deleteLocations(getSchemaFromManifest(manifest, 'schema2'));

    assert.deepEqual(schema1.fields, schema2.fields);
    assert.deepEqual(schema1.refinement, schema2.refinement);
  }));
  it('tests schema intersection, case 1', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a < 0], b: Number, c: Number} [a + b > 10]
        schema2: reads Y {a: Number [a > 10], b: Number [b < 10]} [a + b > 20]
        schema3: reads Z {a: Number [a < 0 or a > 10], b: Number} [a + b > 10 or a + b > 20]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');

    // intersection of schema1 and schema2 should be the same as schema3
    const intersection = deleteLocations(Schema.intersect(schema1, schema2));
    const schema3 = deleteLocations(getSchemaFromManifest(manifest, 'schema3'));
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));
  it('tests schema intersection, case 2', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a < 0], b: Number, c: Number} [a + b > 10]
        schema2: reads Y {a: Number [a > 10], b: Number [b < 10]}
        schema3: reads Z {a: Number [a < 0 or a > 10], b: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');

    // intersection of schema1 and schema2 should be the same as schema3
    const intersection = deleteLocations(Schema.intersect(schema1, schema2));
    const schema3 = deleteLocations(getSchemaFromManifest(manifest, 'schema3'));
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));
  it('tests schema intersection, case 3', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a < 0], b: Number, c: Number} [a + c > 10]
        schema2: reads Y {a: Number [a > 10], b: Number [b < 10]} [a + b > 10]
        schema3: reads Z {a: Number [a < 0 or a > 10], b: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');

    // intersection of schema1 and schema2 should be the same as schema3
    const intersection = deleteLocations(Schema.intersect(schema1, schema2));
    const schema3 = deleteLocations(getSchemaFromManifest(manifest, 'schema3'));
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));
  it('tests schema union', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a > 20], b: Number, c: Number} [a + c > 10]
        schema2: reads Y {a: Number [a > 10], b: Number [b < 10]} [a + b > 10]
        schema3: reads Z {a: Number [a > 20 and a > 10], b: Number [b < 10], c: Number} [a + c > 10 and a + b > 10]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');

    // union of schema1 and schema2 should be the same as schema3
    const intersection = deleteLocations(Schema.union(schema1, schema2));
    const schema3 = deleteLocations(getSchemaFromManifest(manifest, 'schema3'));
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 1', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a > 20], b: Number, c: Number} [a + c > 10]
        schema2: reads X {a: Number [a > 10], b: Number} [a + b > 10]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2));
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 2', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a > 20], b: Number, c: Number}
        schema2: reads X {a: Number [a > 10], b: Number [b > 10]}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isFalse(schema1.isAtLeastAsSpecificAs(schema2));
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 3', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a > 20], b: Boolean [not b]} [a < 100]
        schema2: reads X {a: Number [a > 10 and a < 100], b: Boolean}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2));
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 4', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a > 20], b: Boolean [not b]} [a < 100]
        schema2: reads X {a: Number [a > 10 and a < 100], b: Boolean, c: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isFalse(schema1.isAtLeastAsSpecificAs(schema2));
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 5', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Text [a == 'abc']}
        schema2: reads X {a: Text [a == 'abc' or a == 'ragav']}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2));
  }));
  it('tests schema.isAtLeastAsSpecificAs, case 6', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Text} [a == 'abc' or a == 'josh']
        schema2: reads X {a: Text} [a == 'abc' or a == 'ragav']
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isFalse(schema1.isAtLeastAsSpecificAs(schema2));
  });
  it('tests schema.isAtLeastAsSpecificAs, case 7', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Text} [a != 'abc']
        schema2: reads X {a: Text}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2));
  });
  it('tests warning when refinement specificity is unknown', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number} [a*a+a > 20]
        schema2: reads X {a: Number} [a > 10]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const refWarning = ConCap.capture(() => assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2)));
    assert.match(refWarning.warn[0], /Unable to ascertain if/);
  });
  it('tests to inline schema string for kt types', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        ld: List<Number>
        lI: List<Int>
        lL: List<Long>
        i: Int
        t: Text
        l: Long
    `);
    const schema = manifest.schemas['Foo'];
    const schema_str = schema.toInlineSchemaString();
    assert.strictEqual(
      schema_str,
      'Foo {ld: List<Number>, lI: List<Int>, lL: List<Long>, i: Int, t: Text, l: Long}'
    );
  });
  it('tests restricting reference field', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        foo1: Text
        foo2: Text
      schema Bar
        bar1: Text
        bar2: &Foo
        bar3: [&Foo]
      particle WriteBar
        bar: writes Bar {bar1, bar2: &Foo {foo1}}
        barz: writes [&Bar {bar1, bar2: &Foo {foo1}}]
        barzz: writes Bar {bar1, bar3: [&Foo {foo1}]}
    `);
    const barSchema = manifest.schemas['Bar'];
    const barConnSchema = manifest.particles[0].getConnectionByName('bar').type.getEntitySchema();
    assert.isTrue(barSchema.isAtLeastAsSpecificAs(barConnSchema));
    const barzzConnSchema = manifest.particles[0].getConnectionByName('barzz').type.getEntitySchema();
    assert.isTrue(barSchema.isAtLeastAsSpecificAs(barzzConnSchema));
  });
});
