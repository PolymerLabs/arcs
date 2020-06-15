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
import {EntityType, SingletonType, CollectionType, TypeVariable, TupleType} from '../type.js';
import {Manifest} from '../manifest.js';
import {assert} from '../../platform/chai-web.js';
import {deleteFieldRecursively} from '../util.js';

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
        () => evaluateFieldPath(['foo'], 'Text'),
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
          foo1: reads ~a with {name: Text, friends: [&Person {name: Text}]}
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
});
