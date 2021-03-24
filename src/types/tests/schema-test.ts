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

import {EntityType, ReferenceType, Schema, PrimitiveField, ReferenceField, InlineField,
        CollectionField} from '../lib-types.js';
import {assert} from '../../platform/chai-web.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {Manifest} from '../../runtime/manifest.js';
import {Reference} from '../../runtime/reference.js';
import {Loader} from '../../platform/loader.js';
import {Entity} from '../../runtime/entity.js';
import {ConCap} from '../../testing/test-util.js';
import {Flags} from '../../runtime/flags.js';
import {deleteFieldRecursively} from '../../utils/lib-utils.js';
import {MockStorageFrontend} from '../../runtime/storage/testing/test-storage.js';

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

    const expected = {
      'description': new PrimitiveField('Text'),
      'image': new PrimitiveField('URL'),
      'category': new PrimitiveField('Text'),
      'price': new PrimitiveField('Text'),
      'seller': new PrimitiveField('Text'),
      'shipDays': new PrimitiveField('Number'),
      'url': new PrimitiveField('URL'),
      'identifier': new PrimitiveField('Text'),
      'isReal': new PrimitiveField('Boolean'),
      'name': new PrimitiveField('Text')
    };
    assert.equal(Object.keys(schema.fields).length, Object.keys(expected).length);
    for (const name of Object.keys(schema.fields)) {
      assert.equal(schema.fields[name].toString(), expected[name].toString());
    }
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

    const storageFrontend = new MockStorageFrontend();
    const References = Entity.createEntityClass(manifest.findSchemaByName('References'), storageFrontend);

    const ReferencedOneSchema = manifest.findSchemaByName('ReferencedOne');
    const now = new Date();
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    assert.doesNotThrow(() => {
      new References({
        one: new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(new EntityType(ReferencedOneSchema)), storageFrontend),
        two: null
      });
    });

    assert.throws(() => {
      new References({
        one: null,
        two: new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(new EntityType(ReferencedOneSchema)), storageFrontend)
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
    const storageFrontend = new MockStorageFrontend();
    const Collections = Entity.createEntityClass(manifest.findSchemaByName('Collections'), storageFrontend);
    const FooType = EntityType.make(['Foo'], {value: 'Text'});
    const BarType = EntityType.make(['Bar'], {value: 'Text'});
    new Collections({collection: new Set()});
    const now = new Date();
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    new Collections({
      collection: new Set([new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(FooType), storageFrontend)])
    });
    assert.throws(() => {
      new Collections({collection:
        new Set([new Reference({id: 'test', creationTimestamp: now, entityStorageKey: storageKey}, new ReferenceType(BarType), storageFrontend)])
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
    const expected = new Schema(['Person', 'Animal', 'Thing'], fields);
    const actual = Schema.union(Person, Animal);
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

    deleteFieldRecursively(Product, 'location', {replaceWithNulls: true});
    deleteFieldRecursively(Thing, 'location', {replaceWithNulls: true});

    assert.deepEqual(Schema.intersect(Product, Thing), Thing);
    assert.deepEqual(Schema.intersect(Thing, Product), Thing);
  });

  it('handles schema intersection for shared supertypes', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Thing = manifest.findSchemaByName('Thing');
    const Product = manifest.findSchemaByName('Product');
    const Animal = manifest.findSchemaByName('Animal');

    const fields = {...Thing.fields, isReal: 'Boolean'};
    const expected = new Schema(['Thing'], fields);
    const actual = Schema.intersect(Animal, Product);
    assert.deepEqual(actual, expected);
  });

  it('handles schema intersection if no shared supertype and a conflicting field', async () => {
    const manifest = await Manifest.load('./Product.schema', loader);
    const Product = manifest.findSchemaByName('Product');
    const Person = manifest.findSchemaByName('Person');
    const intersection = Schema.intersect(Person, Product);

    assert.isDefined(Person.fields.price);
    assert.isDefined(Product.fields.price);
    assert.isFalse(Person.fields.price.equals(Product.fields.price));
    assert.isUndefined(intersection.fields.price);

    const expected = new Schema([], {name: 'Text'});
    const actual = Schema.intersect(Person, Product);
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
    assert.strictEqual(schema.fields.name.getType(), 'Text');
    assert.strictEqual(schema.fields.age.getType(), 'Number');
    assert.strictEqual(schema.fields.custom.getType(), 'Bytes');
  });

  it('handles Kotlin style Schema syntax', async () => {
    const manifest = await Manifest.parse(`
      alias schema * as Base { name: Text, phoneNumber: Text, website: URL }

      schema Person extends Base {
        jobTitle: Text
        age: Number
      }

      particle P
        person: reads Person {name, age, custom: Bytes}`);

    const particle = manifest.particles[0];
    const connection = particle.handleConnections[0];
    const schema = connection.type.getEntitySchema();

    assert.deepEqual(schema.names, ['Person']);
    assert.hasAllKeys(schema.fields, ['name', 'age', 'custom']);
    assert.strictEqual(schema.fields.name.getType(), 'Text');
    assert.strictEqual(schema.fields.age.getType(), 'Number');
    assert.strictEqual(schema.fields.custom.getType(), 'Bytes');
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
        inlineCollection: reads * {x: [inline Wiz {str: Text}]}
        tuples: reads Tup {x: (Number, Text)}
        primitiveList: reads * {x: List<Number>, f: List<Boolean>}
        refList: reads * {rc: List<&Wiz {str: Text}>}
        inlineList: reads * {x: List<inline Wiz {str: Text}>}

        fieldInInline: reads Outer {inln: inline Inner {num: Number, text: Text}}
        fieldInParent: reads Outer {inln: inline Inner {num: Number}, text: Text}
        thinglst: reads * {x: List<&Thing {name: Text}>}
    `);
    const getHash = handleName => {
      return manifest.particles[0].getConnectionByName(handleName).type.getEntitySchema().normalizeForHash();
    };

    assert.strictEqual(getHash('empty'), '//');
    assert.strictEqual(getHash('noNames'), '/msg:Text|/');
    assert.strictEqual(getHash('noFields'), 'Foo//');

    assert.strictEqual(getHash('orderedA'), 'Bar Foo Wiz/f:Boolean|s:Text|x:Number|/');
    assert.strictEqual(getHash('orderedA'), getHash('orderedB'));

    assert.strictEqual(getHash('nestedRefs'), 'Foo/num:Number|ref:&(Bar/inner:&(/val:Boolean|/)str:Text|/)/');
    assert.strictEqual(getHash('refCollection'), '/rc:[&(Wiz/str:Text|/)]z:Number|/');
    assert.strictEqual(getHash('primitiveCollection'), '/f:[Boolean]s:[Text]x:[Number]/');
    assert.strictEqual(getHash('inlineCollection'), '/x:[inline Wiz/str:Text|/]/');
    assert.strictEqual(getHash('tuples'), 'Tup/x:(Number|Text)/');
    assert.strictEqual(getHash('primitiveList'), '/f:List<Boolean>x:List<Number>/');
    assert.strictEqual(getHash('refList'), '/rc:List<&(Wiz/str:Text|/)>/');
    assert.strictEqual(getHash('inlineList'), '/x:List<inline Wiz/str:Text|/>/');

    assert.strictEqual(getHash('fieldInInline'), 'Outer/inln:inline Inner/num:Number|text:Text|//');
    assert.strictEqual(getHash('fieldInParent'), 'Outer/inln:inline Inner/num:Number|/text:Text|/');

    assert.strictEqual(getHash('thinglst'), '/x:List<&(Thing/name:Text|/)>/');
  });
  it('tests univariate schema level refinements are propagated to field level', Flags.withFieldRefinementsAllowed(async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number [a < 0], b: Number, c: Number} [a < 10]
        schema2: reads Y {a: Number [a < 0 and a < 10], b: Number, c: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');

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
    const intersection = Schema.intersect(schema1, schema2);
    const schema3 = getSchemaFromManifest(manifest, 'schema3');
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
    const intersection = Schema.intersect(schema1, schema2);
    const schema3 = getSchemaFromManifest(manifest, 'schema3');
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
    const intersection = Schema.intersect(schema1, schema2);
    const schema3 = getSchemaFromManifest(manifest, 'schema3');
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));

  const verifyUnionOfTypes = async (type1: String, type2: String) => {
    const manifest = await Manifest.parse(`
            schema A
              foo: ${type1}

            schema B
              foo: ${type2}
            `);
    const aType = manifest.findSchemaByName('A');
    const bType = manifest.findSchemaByName('B');

    deleteFieldRecursively(aType, 'location', {replaceWithNulls: true});
    deleteFieldRecursively(bType, 'location', {replaceWithNulls: true});

    const aTypeLit = aType.toLiteral();
    const bTypeLit = bType.toLiteral();

    // Union the names
    const unionT = aType.toLiteral();
    unionT.names = ['A', 'B'];

    const unionAB = Schema.union(aType, bType);
    assert.isNotNull(unionAB, 'union of A and B should exist');
    assert.deepEqual(unionAB.toLiteral(), unionT);
    assert.deepEqual(aType.toLiteral(), aTypeLit, 'input (a) to intersection should not be modified');
    assert.deepEqual(bType.toLiteral(), bTypeLit, 'input (b) to intersection should not be modified');

    unionT.names = ['B', 'A'];
    const unionBA = Schema.union(bType, aType);
    assert.isNotNull(unionBA, 'union of B and A should exist');
    assert.deepEqual(unionBA.toLiteral(), unionT);
    assert.deepEqual(aType.toLiteral(), aTypeLit, 'input (a) to intersection should not be modified');
    assert.deepEqual(bType.toLiteral(), bTypeLit, 'input (b) to intersection should not be modified');
  };
  const verifyUnionOf = async (typeBuilder: (type: string) => string) => {
    verifyUnionOfTypes(`${typeBuilder(`Foo {a: Text, b: Text}`)}`, `${typeBuilder(`Foo {a: Text}`)}`);
  };
  const verifyIntersectOfTypes = async (type1: String, type2: String) => {
    const manifest = await Manifest.parse(`
            schema A
              foo: ${type1}

            schema B
              foo: ${type2}
            `);
    const aType = manifest.findSchemaByName('A');
    const bType = manifest.findSchemaByName('B');

    deleteFieldRecursively(aType, 'location', {replaceWithNulls: true});
    deleteFieldRecursively(bType, 'location', {replaceWithNulls: true});

    const aTypeLit = aType.toLiteral();
    const bTypeLit = bType.toLiteral();

    // Intersect the names
    const intersectT = bType.toLiteral();
    intersectT.names = [];

    const intersectionAB = Schema.intersect(aType, bType);
    assert.isNotNull(intersectionAB, 'intersection of A and B should exist');
    assert.deepEqual(intersectionAB.toLiteral(), intersectT);
    assert.deepEqual(aType.toLiteral(), aTypeLit, 'input (a) to intersection should not be modified');
    assert.deepEqual(bType.toLiteral(), bTypeLit, 'input (b) to intersection should not be modified');

    const intersectionBA = Schema.intersect(bType, aType);
    assert.isNotNull(intersectionBA, 'intersection of B and A should exist');
    assert.deepEqual(intersectionBA.toLiteral(), intersectT);
    assert.deepEqual(aType.toLiteral(), aTypeLit, 'input (a) to intersection should not be modified');
    assert.deepEqual(bType.toLiteral(), bTypeLit, 'input (b) to intersection should not be modified');
  };
  const verifyIntersectOf = async (typeBuilder: (type: string) => string) => {
    verifyIntersectOfTypes(`${typeBuilder(`Foo {a: Text, b: Text}`)}`, `${typeBuilder(`Foo {a: Text}`)}`);
  };
  it('tests schema union, with nullable and non-nullable ints', async () => {
    await verifyUnionOfTypes(`Int`, `Int?`);
  });
  it('tests schema union, with nullable ints', async () => {
    await verifyUnionOfTypes(`Int?`, `Int?`);
  });
  it('tests schema union, with nullable and non-nullable text', async () => {
    await verifyUnionOfTypes(`Text`, `Text?`);
  });
  it('tests schema union, with nullable text', async () => {
    await verifyUnionOfTypes(`Text?`, `Text?`);
  });
  it('tests schema union, with nullable inline entities', async () => {
    await verifyUnionOfTypes(`inline Foo {a: Text, b: Text}?`, `inline Foo {a: Text}?`);
  });
  it('tests schema union, with nullable and non-nullable inline entities', async () => {
    await verifyUnionOfTypes(`inline Foo {a: Text, b: Text}`, `inline Foo {a: Text}?`);
  });
  it('tests schema union, with inline entities', async () => {
    await verifyUnionOf((type: string) => `inline ${type}`);
  });
  it('tests schema union, with referenced entities', async () => {
    await verifyUnionOf((type: string) => `&${type}`);
  });
  it('tests schema union, with collections of entities', async () => {
    await verifyUnionOf((type: string) => `[inline ${type}]`);
    await verifyUnionOf((type: string) => `[&${type}]`);
  });
  it('tests schema union, with ordered lists of entities', async () => {
    await verifyUnionOf((type: string) => `List<inline ${type}>`);
    await verifyUnionOf((type: string) => `List<&${type}>`);
  });
  it.skip('tests schema union, with tuples of entities', async () => {
    // See b/175821052
    await verifyUnionOf((type: string) => `(inline ${type}, inline ${type})`);
    await verifyUnionOf((type: string) => `(inline ${type}, &${type})`);
    await verifyUnionOf((type: string) => `(&${type}, inline ${type})`);
    await verifyUnionOf((type: string) => `(&${type}, &${type})`);
  });

  it('tests schema intersection, with inline entities', async () => {
  it('tests schema intersection, with nullable and non-nullable ints', async () => {
    await verifyIntersectOfTypes(`Int`, `Int?`);
  });
  it('tests schema intersection, with nullable ints', async () => {
    await verifyIntersectOfTypes(`Int?`, `Int?`);
  });
  it('tests schema intersection, with nullable and non-nullable text', async () => {
    await verifyIntersectOfTypes(`Text`, `Text?`);
  });
  it('tests schema intersection, with nullable text', async () => {
    await verifyIntersectOfTypes(`Text?`, `Text?`);
  });
  it('tests schema intersection, with nullable inline entities', async () => {
    await verifyIntersectOfTypes(`inline Foo {a: Text, b: Text}?`, `inline Foo {a: Text}?`);
  });
  it('tests schema intersection, with nullable and non-nullable inline entities', async () => {
    await verifyIntersectOfTypes(`inline Foo {a: Text, b: Text}`, `inline Foo {a: Text}?`);
  });
    await verifyIntersectOf((type: string) => `inline ${type}`);
  });
  it('tests schema intersection, with referenced entities', async () => {
    await verifyIntersectOf((type: string) => `&${type}`);
  });
  it('tests schema intersection, with collections of entities', async () => {
    await verifyIntersectOf((type: string) => `[inline ${type}]`);
    await verifyIntersectOf((type: string) => `[&${type}]`);
  });
  it('tests schema intersection, with ordered lists of entities', async () => {
    await verifyIntersectOf((type: string) => `List<inline ${type}>`);
    await verifyIntersectOf((type: string) => `List<&${type}>`);
  });
  it.skip('tests schema intersection, with tuples of entities', async () => {
    // See b/175821052
    await verifyIntersectOf((type: string) => `(inline ${type}, inline ${type})`);
    await verifyIntersectOf((type: string) => `(inline ${type}, &${type})`);
    await verifyIntersectOf((type: string) => `(&${type}, inline ${type})`);
    await verifyIntersectOf((type: string) => `(&${type}, &${type})`);
  });

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
    const intersection = Schema.union(schema1, schema2);
    const schema3 = getSchemaFromManifest(manifest, 'schema3');
    assert.deepEqual(intersection.fields, schema3.fields);
    assert.deepEqual(intersection.refinement, schema3.refinement);
  }));
  it('tests schema union for inlines', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {y: inline Y {a: Text, b: Text}, z: Number}
        schema2: reads X {y: inline Y {a: Text, c: Text}, w: Number, z: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for inlines with mixed (internal and external) schema', async () => {
    const manifest = await Manifest.parse(`
      schema X
        y: inline Y {a: Text, b: Text, c: Text}
        w: Number
        z: Number
      particle Foo
        schema1: reads X {y: inline Y {a: Text, b: Text}, z}
        schema2: reads X {y: inline Y {a: Text, c: Text}, w, z}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union fails for inlines declared implicitly', async () => {
    // Note: This tests that the schema 'X' doesn't declare the 'Y' schema to ensure that only
    // top level schemas can be used by particles (this is a form of namespacing).
    assertThrowsAsync(async () => {
      await Manifest.parse(`
        schema X
          y: inline Y {a: Text, b: Text, c: Text}
          w: Number
          z: Number
        particle Foo
          schema1: reads X {y: inline Y {a, b}, z}
          schema2: reads X {y: inline Y {a, c}, w, z}
      `);
    }, `Could not infer type of 'a' field`);
  });
  it('tests schema union for inlines with external schema', async () => {
    const manifest = await Manifest.parse(`
      schema Y
        a: Text
        b: Text
        c: Text
      schema X
        y: inline Y {a, b, c}
        w: Number
        z: Number
      particle Foo
        schema1: reads X {y: inline Y {a, b}, z}
        schema2: reads X {y: inline Y {a, c}, w, z}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for inlines with external schema for kotlin style schemas', async () => {
    const manifest = await Manifest.parse(`
      schema Y
        a: Text
        b: Text
        c: Text
      schema X
        y: inline Y {a, b, c}
        w: Number
        z: Number
      particle Foo
        schema1: reads X {y: inline Y {a, b}, z}
        schema2: reads X {y: inline Y {a, c}, w, z}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for ordered lists of inlines', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {y: List<inline Y {a: Text, b: Text}>, z: Number}
        schema2: reads X {y: List<inline Y {a: Text, c: Text}>, w: Number, z: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for inline fields', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {y: inline Y {a: Text, b: Text}, z: Number}
        schema2: reads X {y: inline Y {a: Text, c: Text}, w: Number, z: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for inline fields of kotlin style schemas', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {
          y: inline Y {
            a: Text
            b: Text
          },
          z: Number
        }
        schema2: reads X {
          y: inline Y {
            a: Text
            c: Text
          },
          w: Number
          z: Number
        }
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for reference fields', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {y: &Y {a: Text, b: Text}, z: Number}
        schema2: reads X {y: &Y {a: Text, c: Text}, w: Number, z: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for reference fields of kotlin style schemas', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {
          y: &Y {
            a: Text,
            b: Text
          },
          z: Number
        }
        schema2: reads X {
          y: &Y {
            a: Text
            c: Text,
          },
          w: Number
          z: Number
        }
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for inline fields of kotlin style schemas', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {
          y: inline Y {
            a: Text,
            b: Text
          },
          z: Number
        }
        schema2: reads X {
          y: inline Y {
            a: Text
            c: Text,
          },
          w: Number
          z: Number
        }
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
  it('tests schema union for collection fields', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {y: [&Y {a: Text, b: Text}], z: Number}
        schema2: reads X {y: [&Y {a: Text, c: Text}], w: Number, z: Number}
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const union = Schema.union(schema1, schema2);
    assert.deepEqual(Object.keys(union.fields), ['y', 'z', 'w']);
    assert.deepEqual(Object.keys(union.fields['y'].getFieldType().getFieldType().getEntityType().entitySchema.fields),
        ['a', 'b', 'c']);
  });
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
  it('tests warning when refinement specificity is unknown', Flags.withFlags({warnOnUnsafeRefinement: true}, async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number} [a*a+a > 20]
        schema2: reads X {a: Number} [a > 10]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const refWarning = ConCap.capture(() => assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2)));
    for (const warn of refWarning.warn) {
      assert.match(warn[0], /Unable to ascertain if .* is at least as specific as .*/);
    }
    assert.lengthOf(refWarning.warn, 1);
  }));
  it('tests warning when refinement specificity is unknown', Flags.withFlags({warnOnUnsafeRefinement: false}, async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        schema1: reads X {a: Number} [a*a+a > 20]
        schema2: reads X {a: Number} [a > 10]
    `);
    const schema1 = getSchemaFromManifest(manifest, 'schema1');
    const schema2 = getSchemaFromManifest(manifest, 'schema2');
    const refWarning = ConCap.capture(() => assert.isTrue(schema1.isAtLeastAsSpecificAs(schema2)));
    assert.lengthOf(refWarning.warn, 0);
  }));
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
        bar4: [Text]
        bar5: [Float]
      particle WriteBar
        bar: writes Bar {bar1, bar2: &Foo {foo1}, bar4, bar5}
        barz: writes [&Bar {bar1, bar2: &Foo {foo1}}]
        barzz: writes Bar {bar1, bar3: [&Foo {foo1}]}
    `);
    const barSchema = manifest.schemas['Bar'];
    const barConnSchema = manifest.particles[0].getConnectionByName('bar').type.getEntitySchema();
    assert.isTrue(barSchema.isAtLeastAsSpecificAs(barConnSchema));
    const barzzConnSchema = manifest.particles[0].getConnectionByName('barzz').type.getEntitySchema();
    assert.isTrue(barSchema.isAtLeastAsSpecificAs(barzzConnSchema));
  });
  it('produces different hashes for different schemas - reproduction', async () => {
    const oldManifest = await Manifest.parse(`
      schema ActionFeedbackDeprecated
        interactionSessionId: Text
        userInteraction: Text
    
      schema EntityDeprecated
        numWords: Int
        verticalTypeName: Text

      schema SelectionFeedbackDeprecated
        interactionSessionId: Text
        selectedEntity: inline EntityDeprecated
        userInteraction: Text

      schema FeedbackDeprecated
        id: Text
        timestampMs: Long
        actionFeedback: inline ActionFeedbackDeprecated
        selectionFeedback: inline SelectionFeedbackDeprecated
      
      schema FeedbackBatchDeprecated
        feedback: List<inline FeedbackDeprecated>
        overviewSessionId: Text
        screenSessionId: Long    
    `);

    const newManifest = await Manifest.parse(`
      schema ActionFeedbackDeprecated
        interactionSessionId: Text
        userInteraction: Text
    
      schema EntityDeprecated
        numWords: Int
        verticalTypeName: Text

      schema SelectionFeedbackDeprecated
        interactionSessionId: Text
        selectedEntity: inline EntityDeprecated
        userInteraction: Text

      schema TaskSnapshotFeedbackDeprecated
        interactionSessionId: Text
        taskAppComponentName: Text

      schema FeedbackDeprecated
        id: Text
        timestampMs: Long
        actionFeedback: inline ActionFeedbackDeprecated
        selectionFeedback: inline SelectionFeedbackDeprecated
        taskSnapshotFeedback: inline TaskSnapshotFeedbackDeprecated
      
      schema FeedbackBatchDeprecated
        feedback: List<inline FeedbackDeprecated>
        overviewSessionId: Text
        screenSessionId: Long    
    `);

    const oldFeedbackDeprecated = oldManifest.schemas['FeedbackBatchDeprecated'];
    const newFeedbackDeprecated = newManifest.schemas['FeedbackBatchDeprecated'];

    assert.notEqual(await oldFeedbackDeprecated.hash(), await newFeedbackDeprecated.hash());
  });
  it('produces different hashes for different schemas - inline ordered lists', async () => {
    const manifest1 = await Manifest.parse(`
      schema Inner
        text: Text

      schema Outer
        list: List<inline Inner>
    `);
    const manifest2 = await Manifest.parse(`
      schema Inner
        text: Text
        num: Number

      schema Outer
        list: List<inline Inner>
    `);

    assert.notEqual(await manifest1.schemas['Outer'].hash(), await manifest2.schemas['Outer'].hash());
  });
  it('produces different hashes for different schemas - misalignment of fields', async () => {
    const manifest1 = await Manifest.parse(`
      schema Inner
        num: Number

      schema Outer
        list: inline Inner
        text: Text
    `);
    const manifest2 = await Manifest.parse(`
      schema Inner
        text: Text
        num: Number

      schema Outer
        list: inline Inner
    `);

    // These should not be equal!
    assert.notEqual(await manifest1.schemas['Outer'].hash(), await manifest2.schemas['Outer'].hash());
  });
  describe('recursive schemas', async () => {
    it('handles recursive Schemas syntax', Flags.withFlags({recursiveSchemasAllowed: true}, async () => {
      const manifest = await Manifest.parse(`
        schema GraphNode
          name: Text
          neighbors: [&GraphNode]`);

      const schema = manifest.schemas['GraphNode'];
      assert.deepEqual(schema.names, ['GraphNode']);
      assert.hasAllKeys(schema.fields, ['name', 'neighbors']);
      assert.strictEqual(schema.fields.name.getType(), 'Text');
      const neighbors = schema.fields.neighbors as CollectionField;
      assert.strictEqual(neighbors.kind, 'schema-collection');
      const ref = neighbors.schema as ReferenceField;
      assert.strictEqual(ref.kind, 'schema-reference');
      const inline = ref.schema as InlineField;
      assert.strictEqual(inline.kind, 'schema-inline');
      const model = inline.model;
      const recursiveSchema = model.entitySchema;
      assert.deepEqual(recursiveSchema.names, ['GraphNode']);
      assert.hasAllKeys(recursiveSchema.fields, ['name', 'neighbors']);
      assert.strictEqual(recursiveSchema.fields.name.getType(), 'Text');
    }));
    it('catches disallowed recursive Schemas syntax', Flags.withFlags({recursiveSchemasAllowed: false}, async () => {
      assertThrowsAsync(async () => {
        await Manifest.parse(`
          schema GraphNode
            name: Text
            neighbors: [&GraphNode]`);
      }, `Recursive schemas are unsuported, unstable support can be enabled via the 'recursiveSchemasAllowed' flag: GraphNode`);
    }));
    it('catches disallowed co-recursive (2 steps) Schemas syntax', Flags.withFlags({recursiveSchemasAllowed: false}, async () => {
      assertThrowsAsync(async () => {
        await Manifest.parse(`
          schema Edge
            name: Text
            from: &Node
            to: &Node
          schema Node
            name: Text
            edges: [&Edge]`);
      }, /Recursive schemas are unsuported, unstable support can be enabled via the 'recursiveSchemasAllowed' flag: (Node|Edge)/);
    }));
    it('catches disallowed co-recursive (3 steps) Schemas syntax', Flags.withFlags({recursiveSchemasAllowed: false}, async () => {
      assertThrowsAsync(async () => {
        await Manifest.parse(`
          schema Edges
            edges: [&Edge]
          schema Edge
            name: Text
            from: &Node
            to: &Node
          schema Node
            name: Text
            edges: &Edges`);
      }, /Recursive schemas are unsuported, unstable support can be enabled via the 'recursiveSchemasAllowed' flag: (Node|Edge|Edges)/);
    }));
    it('catches disallowed co-recursive inline (2 steps) Schemas syntax', Flags.withFlags({recursiveSchemasAllowed: false}, async () => {
      assertThrowsAsync(async () => {
        await Manifest.parse(`
          schema Edge
            name: Text
            from: inline Node
            to: inline Node
          schema Node
            name: Text
            edges: [&Edge]`);
      }, /Recursive schemas are unsuported, unstable support can be enabled via the 'recursiveSchemasAllowed' flag: (Node|Edge)/);
    }));
  });
});
