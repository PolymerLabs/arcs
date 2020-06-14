/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {validateFieldPath} from '../field-path.js';
import {EntityType, SingletonType, CollectionType, TypeVariable} from '../type.js';
import {Manifest} from '../manifest.js';
import {assert} from '../../platform/chai-web.js';

async function parseSchema(manifestStr: string) {
  const manifest = await Manifest.parse(manifestStr);
  assert.lengthOf(manifest.allSchemas, 1);
  return manifest.allSchemas[0];
}

async function parseTypeFromHandle(handleName: string, manifestStr: string) {
  const manifest = await Manifest.parse(manifestStr);
  assert.lengthOf(manifest.allParticles, 1);
  const particle = manifest.allParticles[0];
  assert.isTrue(particle.handleConnectionMap.has(handleName));
  const handleSpec = particle.handleConnectionMap.get(handleName);
  return handleSpec.type;
}

describe('field path validation', () => {
  it('empty field path is valid', async () => {
    const type = new EntityType(await parseSchema('schema Foo'));
    validateFieldPath([], type);
  });

  it('top-level entity fields are valid', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        txt: Text
        num: Number
        bool: Boolean
        txts: [Text]
        nums: [Number]
        bools: [Boolean]
    `));
    validateFieldPath(['txt'], type);
    validateFieldPath(['num'], type);
    validateFieldPath(['bool'], type);
    validateFieldPath(['txts'], type);
    validateFieldPath(['nums'], type);
    validateFieldPath(['bools'], type);
  });

  it('unknown top-level fields are invalid', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        real: Number
    `));
    assert.throws(
        () => validateFieldPath(['missing'], type),
        `Field 'missing' does not exist in: schema Foo`);
  });

  it('cannot refer to fields inside a primitive', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        txt: Text
        txts: [Text]
    `));
    assert.throws(
        () => validateFieldPath(['txt.inside'], type),
        `Field 'txt.inside' does not exist in: schema Foo`);
    assert.throws(
        () => validateFieldPath(['txts.inside'], type),
        `Field 'txts.inside' does not exist in: schema Foo`);
  });

  it('reference fields are valid', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        person: &Person {name: Text}
    `));
    validateFieldPath(['person'], type);
  });

  it('can refer to fields inside references', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        person: &Person {name: Text}
    `));
    validateFieldPath(['person', 'name'], type);
  });

  it('missing fields inside references are rejected', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        person: &Person {name: Text}
    `));
    assert.throws(
        () => validateFieldPath(['person', 'missing'], type),
        `Field 'person.missing' does not exist in: schema Foo`);
  });

  it('can refer to fields inside collections of references', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `));
    validateFieldPath(['person', 'name'], type);
  });

  it('missing fields inside collections of references are rejected', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        person: [&Person {name: Text}]
    `));
    assert.throws(
        () => validateFieldPath(['person', 'missing'], type),
        `Field 'person.missing' does not exist in: schema Foo`);
  });

  it('can refer to fields inside deeply nested references', async () => {
    const type = new EntityType(await parseSchema(`
      schema Foo
        aaa: [&Aaa {bbb: [&Bbb {ccc: [Number]}]}]
    `));
    validateFieldPath(['aaa'], type);
    validateFieldPath(['aaa', 'bbb'], type);
    validateFieldPath(['aaa', 'bbb', 'ccc'], type);
  });

  it('works transparently with SingletonType', async () => {
    const type = new SingletonType(new EntityType(await parseSchema(`
      schema Foo
        name: Text
    `)));
    validateFieldPath(['name'], type);
    assert.throws(
      () => validateFieldPath(['missing'], type),
      `Field 'missing' does not exist in: schema Foo`);
  });

  it('works transparently with CollectionType', async () => {
    const type = new CollectionType(new EntityType(await parseSchema(`
      schema Foo
        name: Text
    `)));
    validateFieldPath(['name'], type);
    assert.throws(
      () => validateFieldPath(['missing'], type),
      `Field 'missing' does not exist in: schema Foo`);
  });

  describe('type variables', () => {
    it('cannot refer to fields inside unconstrained type variables', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a
      `);
      assert.instanceOf(type, TypeVariable);
      assert.throws(
          () => validateFieldPath(['foo'], type),
          `Type variable ~a does not contain field 'foo'.`);
    });

    it('can refer to known fields inside type variables with read constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      validateFieldPath(['name'], type);
    });

    it('can refer to known fields inside type variables with write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: writes ~a with {name: Text}
      `);
      validateFieldPath(['name'], type);
    });

    it('can refer to known fields inside type variables with read-write constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads writes ~a with {name: Text}
      `);
      validateFieldPath(['name'], type);
    });

    it('cannot refer to missing fields inside type variables that do not match the constraints', async () => {
      const type = await parseTypeFromHandle('foo', `
        particle P
          foo: reads ~a with {name: Text}
      `);
      assert.throws(
          () => validateFieldPath(['missing'], type),
          `Field 'missing' does not exist in`);
    });

    it('can refer to known fields inside type variables constraints from other handles', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a
      `);
      validateFieldPath(['name'], type);
    });

    it('can refer to known fields inside type variables from numerous constraints', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo: reads ~a with {name: Text}
          bar: writes ~a with {age: Number}
      `);
      validateFieldPath(['name'], type);
      validateFieldPath(['age'], type);
    });

    it('supports complex nesting inside type variables', async () => {
      const type = await parseTypeFromHandle('bar', `
        particle P
          foo1: reads ~a with {name: Text, friends: [&Person {name: Text}]}
          bar: writes ~a
      `);
      validateFieldPath(['name'], type);
      validateFieldPath(['friends'], type);
      validateFieldPath(['friends', 'name'], type);
    });
  });
});
