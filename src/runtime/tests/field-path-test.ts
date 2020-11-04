/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {resolveFieldPathType} from '../field-path.js';
import {EntityType, SingletonType, CollectionType, TypeVariable, TupleType} from '../../types/lib-types.js';
import {Manifest} from '../manifest.js';
import {assert} from '../../platform/chai-web.js';
import {deleteFieldRecursively} from '../../utils/lib-utils.js';
import {Flags} from '../flags.js';

async function parseTypeFromSchema(manifestStr: string) {
  const manifest = await Manifest.parse(manifestStr);
  assert.lengthOf(manifest.allSchemas, 1);
  const schema = manifest.allSchemas[0];
  deleteFieldRecursively(schema, 'location');
  return new EntityType(schema);
}

async function parseTypeFromHandle(handleName: string, manifestStr: string) {
  const manifest = await Manifest.parse(manifestStr);
  assert.lengthOf(manifest.allParticles, 1);
  const particle = manifest.allParticles[0];
  assert.isTrue(particle.handleConnectionMap.has(handleName));
  const handleSpec = particle.handleConnectionMap.get(handleName);
  const type = handleSpec.type;
  deleteFieldRecursively(type, 'location');
  return type;
}

describe('field path validation', () => {
  it('empty field path is valid', async () => {
    const type = await parseTypeFromSchema('schema Foo');
    assert.deepEqual(resolveFieldPathType([], type), type);
  });

  it('top-level entity fields are valid', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        txt: Text
        num: Number
        bool: Boolean
        txts: [Text]
        nums: [Number]
        bools: [Boolean]
    `);
    assert.strictEqual(resolveFieldPathType(['txt'], type), 'Text');
    assert.strictEqual(resolveFieldPathType(['num'], type), 'Number');
    assert.strictEqual(resolveFieldPathType(['bool'], type), 'Boolean');
    assert.strictEqual(resolveFieldPathType(['txts'], type), 'Text');
    assert.strictEqual(resolveFieldPathType(['nums'], type), 'Number');
    assert.strictEqual(resolveFieldPathType(['bools'], type), 'Boolean');
  });

  it('support Kotlin primitive types', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        byte: Byte
        short: Short
        int: Int
        long: Long
        char: Char
        float: Float
        double: Double
    `);
    assert.strictEqual(resolveFieldPathType(['byte'], type), 'Byte');
    assert.strictEqual(resolveFieldPathType(['short'], type), 'Short');
    assert.strictEqual(resolveFieldPathType(['int'], type), 'Int');
    assert.strictEqual(resolveFieldPathType(['long'], type), 'Long');
    assert.strictEqual(resolveFieldPathType(['char'], type), 'Char');
    assert.strictEqual(resolveFieldPathType(['float'], type), 'Float');
    assert.strictEqual(resolveFieldPathType(['double'], type), 'Double');
  });

  it('unknown top-level fields are invalid', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        real: Number
    `);
    assert.throws(
        () => resolveFieldPathType(['missing'], type),
        `Schema 'Foo {real: Number}' does not contain field 'missing'.`);
  });

  it('cannot refer to fields inside a primitive', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        txt: Text
        txts: [Text]
    `);
    assert.throws(
        () => resolveFieldPathType(['txt.inside'], type),
        `Schema 'Foo {txt: Text, txts: [Text]}' does not contain field 'txt.inside'.`);
    assert.throws(
        () => resolveFieldPathType(['txts.inside'], type),
        `Schema 'Foo {txt: Text, txts: [Text]}' does not contain field 'txts.inside'.`);
    assert.throws(
        () => resolveFieldPathType(['foo'], 'Text'),
        `Field path 'foo' could not be resolved because the target type is a primitive: 'Text'.`);
  });

  it('reference fields are valid', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: &Person {name: Text}
    `);
    const expectedPersonType = await parseTypeFromSchema(`
      schema Person
        name: Text
    `);
    assert.deepEqual(resolveFieldPathType(['person'], type), expectedPersonType);
  });

  it('can refer to fields inside references', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: &Person {name: Text}
    `);
    assert.strictEqual(resolveFieldPathType(['person', 'name'], type), 'Text');
  });

  it('missing fields inside references are rejected', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: &Person {name: Text}
    `);
    assert.throws(
        () => resolveFieldPathType(['person', 'missing'], type),
        `Schema 'Person {name: Text}' does not contain field 'missing'.`);
  });

  it('can refer to fields inside collections of references', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `);
    assert.strictEqual(resolveFieldPathType(['person', 'name'], type), 'Text');
  });

  it('missing fields inside collections of references are rejected', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `);
    assert.throws(
        () => resolveFieldPathType(['person', 'missing'], type),
        `Schema 'Person {name: Text}' does not contain field 'missing'.`);
  });

  it('can refer to fields inside deeply nested references', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        aaa: [&Aaa {bbb: [&Bbb {ccc: [Number]}]}]
    `);
    const expectedAaaType = await parseTypeFromSchema(`
      schema Aaa
        bbb: [&Bbb {ccc: [Number]}]
    `);
    const expectedBbbType = await parseTypeFromSchema(`
      schema Bbb
        ccc: [Number]
    `);
    assert.deepEqual(resolveFieldPathType(['aaa'], type), expectedAaaType);
    assert.deepEqual(resolveFieldPathType(['aaa', 'bbb'], type), expectedBbbType);
    assert.strictEqual(resolveFieldPathType(['aaa', 'bbb', 'ccc'], type), 'Number');
  });

  it('works transparently with SingletonType', async () => {
    const type = new SingletonType(await parseTypeFromSchema(`
      schema Foo
        name: Text
    `));
    assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    assert.throws(
      () => resolveFieldPathType(['missing'], type),
      `Schema 'Foo {name: Text}' does not contain field 'missing'.`);
  });

  it('works transparently with CollectionType', async () => {
    const type = new CollectionType(await parseTypeFromSchema(`
      schema Foo
        name: Text
    `));
    assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    assert.throws(
      () => resolveFieldPathType(['missing'], type),
      `Schema 'Foo {name: Text}' does not contain field 'missing'.`);
  });

  describe('type variables', () => {
    it('cannot refer to fields inside unconstrained type variables', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a
      `);
      assert.instanceOf(type, TypeVariable);
      assert.throws(
          () => resolveFieldPathType(['foo'], type),
          `Type variable ~a does not contain field 'foo'.`);
    });

    it('can refer to known fields inside type variables with read constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables with write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: writes ~a with {name: Text}
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables with read-write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads writes ~a with {name: Text}
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    });

    it('cannot refer to missing fields inside type variables that do not match the constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      assert.throws(
          () => resolveFieldPathType(['missing'], type),
          `Schema '* {name: Text}' does not contain field 'missing'.`);
    });

    it('can refer to known fields inside type variables constraints from other handles', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables from numerous constraints', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a with {age: Number}
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
      assert.strictEqual(resolveFieldPathType(['age'], type), 'Number');
    });

    it('supports complex nesting inside type variables', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text, friends: [&Person {name: Text}]}
          bar: writes ~a
      `);
      const expectedPersonType = await parseTypeFromSchema(`
        schema Person
          name: Text
      `);
      assert.strictEqual(resolveFieldPathType(['name'], type), 'Text');
      assert.deepEqual(resolveFieldPathType(['friends'], type), expectedPersonType);
      assert.strictEqual(resolveFieldPathType(['friends', 'name'], type), 'Text');
    });

    it('can refer to fields inside a resolved type', async () => {
      const typeVariable = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a
      `) as TypeVariable;
      const personType = await parseTypeFromSchema(`
        schema Person
          name: Text
          age: Number
      `);
      typeVariable.variable.resolution = personType;
      assert.deepEqual(typeVariable.variable.resolution, personType);
      assert.isNull(typeVariable.canReadSubset);
      assert.isNull(typeVariable.canWriteSuperset);

      assert.strictEqual(resolveFieldPathType(['name'], typeVariable), 'Text');
      assert.throws(
          () => resolveFieldPathType(['missing'], typeVariable),
          `Schema 'Person {name: Text, age: Number}' does not contain field 'missing'.`);
        });
  });

  describe('tuples', () => {
    it('supports tuples', async () => {
      const fooType = await parseTypeFromSchema(`
        schema Foo
          foo: Text
      `);
      const barType = await parseTypeFromSchema(`
        schema Bar
          bar: Text
      `);
      const tupleType = new TupleType([fooType, barType]);
      assert.deepEqual(resolveFieldPathType([], tupleType), tupleType);
      assert.deepEqual(resolveFieldPathType(['first'], tupleType), fooType);
      assert.strictEqual(resolveFieldPathType(['first', 'foo'], tupleType), 'Text');
      assert.deepEqual(resolveFieldPathType(['second'], tupleType), barType);
      assert.strictEqual(resolveFieldPathType(['second', 'bar'], tupleType), 'Text');
    });

    it('rejects invalid tuple components', async () => {
      const entityType = await parseTypeFromSchema(`
        schema Foo
          foo: Text
      `);
      const tupleType = new TupleType([entityType, entityType]);
      assert.throws(
          () => resolveFieldPathType(['third'], tupleType),
          `The third tuple component was requested but tuple only has 2 components.`);
      assert.throws(
          () => resolveFieldPathType(['missing'], tupleType),
          `Expected a tuple component accessor of the form 'first', 'second', etc., but found 'missing'.`);
    });

    it('rejects missing fields nested inside tuples', async () => {
      const entityType = await parseTypeFromSchema(`
        schema Foo
          foo: Text
      `);
      const tupleType = new TupleType([entityType, entityType]);
      assert.throws(
          () => resolveFieldPathType(['second', 'missing'], tupleType),
          `Schema 'Foo {foo: Text}' does not contain field 'missing'.`);
    });
  });

  describe('inline schemas', () => {
    it('can refer to inline schemas', async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          inlined: inline Foo {name: Text}
      `);
      resolveFieldPathType(['inlined'], type);
    });

    it('can refer to fields nested inside inline schemas', async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          inlined: inline Foo {name: Text}
        `);
      resolveFieldPathType(['inlined', 'name'], type);
    });

    it('rejects missing fields nested inside inline schemas', Flags.withFlags({recursiveSchemasAllowed: true}, async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          inlined: inline Foo {name: Text}
        `);
      assert.throws(
          () => resolveFieldPathType(['inlined', 'missing'], type),
          `Schema 'Foo {name: Text}' does not contain field 'missing'.`);
    }));
  });

  describe('ordered lists', () => {
    it('can refer to ordered lists', async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          list: List<Number>
      `);
      resolveFieldPathType(['list'], type);
    });

    it('can refer to fields nested inside ordered lists', Flags.withFlags({recursiveSchemasAllowed: true}, async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          list: List<&Bar {inner: Number}>
      `);
      resolveFieldPathType(['list', 'inner'], type);
    }));

    it('rejects missing fields nested inside ordered lists', Flags.withFlags({recursiveSchemasAllowed: true}, async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          list: List<&Bar {inner: Number}>
      `);
      assert.throws(
          () => resolveFieldPathType(['list', 'missing'], type),
          `Schema 'Bar {inner: Number}' does not contain field 'missing'.`);
    }));

    it('works with inlined schemas inside ordered lists', Flags.withFlags({recursiveSchemasAllowed: true}, async () => {
      const type = await parseTypeFromSchema(`
        schema Bar
          list: List<inline Bar {inner: Number}>
      `);
      resolveFieldPathType(['list'], type);
      resolveFieldPathType(['list', 'inner'], type);
    }));
  });
});
