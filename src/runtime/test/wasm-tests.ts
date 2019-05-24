/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {EntityProtoConverter, EntityPackager} from '../wasm.js';
import {Manifest} from '../manifest.js';
import {EntityType, ReferenceType} from '../type.js';
import {Reference} from '../reference.js';
import {toProtoFile} from '../../tools/wasm-tools.js';

describe('wasm', () => {

  let schema;
  before(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text      txt
        URL       lnk
        Number    num
        Boolean   flg`);
    schema = manifest.schemas.Foo;
  });

  it('entity to proto conversion supports basic types', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({
      txt: 'abc',
      lnk: 'http://def',
      num: 37,
      flg: true
    });

    const epc = new EntityProtoConverter(schema);
    const buffer = epc.encode(foo);
    const copy = epc.decode(buffer);
    assert.deepEqual(foo, copy);
  });

  it('entity to proto conversion supports partially assigned values', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: 'abc', num: -5.1});

    const epc = new EntityProtoConverter(schema);
    const buffer = epc.encode(foo);
    const copy = epc.decode(buffer);
    assert.deepEqual(foo, copy);
  });

  it('entity to proto conversion supports zero and empty values', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({
      txt: '',
      lnk: '',
      num: 0,
      flg: false
    });

    const epc = new EntityProtoConverter(schema);
    const buffer = epc.encode(foo);
    const copy = epc.decode(buffer);

    // Round-tripping an empty collection results in an unset field so we can't
    // compare to the original entity.
    const cleaned = new entityClass({txt: '', lnk: '', num: 0, flg: false});
    assert.deepEqual(cleaned, copy);
  });

  it('entity to proto conversion fails for not-yet-supported types', async () => {
    const manifest = await Manifest.parse(`
      schema BytesFail
        Bytes foo
      schema ObjectFail
        Object foo
      schema UnionFail
        (Text or URL or Number) foo
      schema TupleFail
        (Text, URL, Number) foo
      schema NamedRefFail
        Reference<BytesFail> foo
      schema InlineRefFail
        Reference<Bar {Text val}> foo`);

    for (const schema of Object.values(manifest.schemas)) {
      assert.throws(() => new EntityProtoConverter(schema), 'not yet supported');
    }
  });

  it('entity packaging supports basic types', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({
      txt: 'abc',
      lnk: 'http://def',
      num: 37,
      flg: true
    });

    const packager = new EntityPackager(schema);
    const encoded = packager.encode(foo);
    assert.deepEqual(foo, packager.decode(encoded));
  });

  it('entity packaging supports partially assigned values', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: 'abc', num: -5.1});

    const packager = new EntityPackager(schema);
    const encoded = packager.encode(foo);
    assert.deepEqual(foo, packager.decode(encoded));
  });

  it('entity packaging supports zero and empty values', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({
      txt: '',
      lnk: '',
      num: 0,
      flg: false
    });

    const packager = new EntityPackager(schema);
    const encoded = packager.encode(foo);
    assert.deepEqual(foo, packager.decode(encoded));
  });

  it('entity packaging fails for not-yet-supported types', async () => {
    const manifest = await Manifest.parse(`
      schema BytesFail
        Bytes foo
      schema ObjectFail
        Object foo
      schema UnionFail
        (Text or URL or Number) foo
      schema TupleFail
        (Text, Number) foo
      schema NamedRefFail
        Reference<BytesFail> foo
      schema InlineRefFail
        Reference<Bar {Text val}> foo`);

    const verify = (schema, value) => {
      const entity = new (schema.entityClass())({foo: value});
      assert.throws(() => new EntityPackager(schema).encode(entity), 'not yet supported');
    };

    const makeRef = entityType => new Reference({id: 'i', storageKey: 'k'}, new ReferenceType(entityType), null);

    verify(manifest.schemas.BytesFail, new Uint8Array([2]));
    verify(manifest.schemas.ObjectFail, {x: 1});
    verify(manifest.schemas.UnionFail, 12);
    verify(manifest.schemas.TupleFail, ['abc', 78]);
    verify(manifest.schemas.NamedRefFail, makeRef(new EntityType(manifest.schemas.BytesFail)));
    verify(manifest.schemas.InlineRefFail, makeRef(EntityType.make(['Bar'], {val: 'Text'})));
  });

  it('schema to .proto file conversion supports basic types', async () => {
    const protoFile = await toProtoFile(schema);

    assert.deepEqual(`syntax = "proto2";

package arcs;

message Foo {

    optional bool flg = 1;
    optional Url lnk = 2;
    optional double num = 3;
    optional string txt = 4;
}

message Url {

    optional string href = 1;
}`, protoFile);
  });
});
