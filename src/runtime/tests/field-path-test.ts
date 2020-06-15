/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {evaluateFieldPath} from '../field-path.js';
import {EntityType, SingletonType, CollectionType, TypeVariable} from '../type.js';
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
    assert.deepEqual(evaluateFieldPath([], type), type);
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
    assert.strictEqual(evaluateFieldPath(['txt'], type), 'Text');
    assert.strictEqual(evaluateFieldPath(['num'], type), 'Number');
    assert.strictEqual(evaluateFieldPath(['bool'], type), 'Boolean');
    assert.strictEqual(evaluateFieldPath(['txts'], type), 'Text');
    assert.strictEqual(evaluateFieldPath(['nums'], type), 'Number');
    assert.strictEqual(evaluateFieldPath(['bools'], type), 'Boolean');
  });

  it('unknown top-level fields are invalid', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        real: Number
    `);
    assert.throws(
        () => evaluateFieldPath(['missing'], type),
        `Schema 'Foo {real: Number}' does not contain field 'missing'.`);
  });

  it('cannot refer to fields inside a primitive', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        txt: Text
        txts: [Text]
    `);
    assert.throws(
        () => evaluateFieldPath(['txt.inside'], type),
        `Schema 'Foo {txt: Text, txts: [Text]}' does not contain field 'txt.inside'.`);
    assert.throws(
        () => evaluateFieldPath(['txts.inside'], type),
        `Schema 'Foo {txt: Text, txts: [Text]}' does not contain field 'txts.inside'.`);
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
    assert.deepEqual(evaluateFieldPath(['person'], type), expectedPersonType);
  });

  it('can refer to fields inside references', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: &Person {name: Text}
    `);
    assert.strictEqual(evaluateFieldPath(['person', 'name'], type), 'Text');
  });

  it('missing fields inside references are rejected', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: &Person {name: Text}
    `);
    assert.throws(
        () => evaluateFieldPath(['person', 'missing'], type),
        `Schema 'Person {name: Text}' does not contain field 'missing'.`);
  });

  it('can refer to fields inside collections of references', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `);
    assert.strictEqual(evaluateFieldPath(['person', 'name'], type), 'Text');
  });

  it('missing fields inside collections of references are rejected', async () => {
    const type = await parseTypeFromSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `);
    assert.throws(
        () => evaluateFieldPath(['person', 'missing'], type),
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
    assert.deepEqual(evaluateFieldPath(['aaa'], type), expectedAaaType);
    assert.deepEqual(evaluateFieldPath(['aaa', 'bbb'], type), expectedBbbType);
    assert.strictEqual(evaluateFieldPath(['aaa', 'bbb', 'ccc'], type), 'Number');
  });

  it('works transparently with SingletonType', async () => {
    const type = new SingletonType(await parseTypeFromSchema(`
      schema Foo
        name: Text
    `));
    assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    assert.throws(
      () => evaluateFieldPath(['missing'], type),
      `Schema 'Foo {name: Text}' does not contain field 'missing'.`);
  });

  it('works transparently with CollectionType', async () => {
    const type = new CollectionType(await parseTypeFromSchema(`
      schema Foo
        name: Text
    `));
    assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    assert.throws(
      () => evaluateFieldPath(['missing'], type),
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
          () => evaluateFieldPath(['foo'], type),
          `Type variable ~a does not contain field 'foo'.`);
    });

    it('can refer to known fields inside type variables with read constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables with write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: writes ~a with {name: Text}
      `);
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables with read-write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads writes ~a with {name: Text}
      `);
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    });

    it('cannot refer to missing fields inside type variables that do not match the constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      assert.throws(
          () => evaluateFieldPath(['missing'], type),
          `Schema '* {name: Text}' does not contain field 'missing'.`);
    });

    it('can refer to known fields inside type variables constraints from other handles', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a
      `);
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
    });

    it('can refer to known fields inside type variables from numerous constraints', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a with {age: Number}
      `);
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
      assert.strictEqual(evaluateFieldPath(['age'], type), 'Number');
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
      assert.strictEqual(evaluateFieldPath(['name'], type), 'Text');
      assert.deepEqual(evaluateFieldPath(['friends'], type), expectedPersonType);
      assert.strictEqual(evaluateFieldPath(['friends', 'name'], type), 'Text');
    });
  });
});
