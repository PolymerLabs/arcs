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
import {EntityType, SingletonType, CollectionType} from '../type.js';
import {Manifest} from '../manifest.js';
import {assert} from '../../platform/chai-web.js';

async function parseSchema(manifestStr: string) {
  const manifest = await Manifest.parse(manifestStr);
  assert.lengthOf(manifest.allSchemas, 1);
  return manifest.allSchemas[0];
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
});
