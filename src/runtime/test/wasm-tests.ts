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
import {EntityPackager} from '../wasm.js';
import {Manifest} from '../manifest.js';
import {EntityType, ReferenceType} from '../type.js';
import {Reference} from '../reference.js';
import {toProtoFile} from '../../tools/wasm-tools.js';

describe('wasm', () => {

  let manifest;
  before(async () => {
    manifest = await Manifest.parse(`
      schema Foo
        Text      txt
        URL       lnk
        Number    num
        Boolean   flg`);
  });

  it('entity packaging supports basic field types', async () => {
    const schema = manifest.schemas.Foo;
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: 'abc', lnk: 'http://def', num: 37, flg: true});
    foo.identify('test');

    const packager = new EntityPackager(schema);
    const encoded = packager.encodeSingleton(foo);
    assert.deepEqual(foo, packager.decodeSingleton(encoded));
  });

  it('entity packaging supports partially assigned entity', async () => {
    const schema = manifest.schemas.Foo;
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: 'abc', num: -5.1});
    foo.identify('!test:foo:bar|');

    const packager = new EntityPackager(schema);
    const encoded = packager.encodeSingleton(foo);
    assert.deepEqual(foo, packager.decodeSingleton(encoded));
  });

  it('entity packaging supports zero and empty values', async () => {
    const schema = manifest.schemas.Foo;
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: '', lnk: '', num: 0, flg: false});
    foo.identify('te|st');

    const packager = new EntityPackager(schema);
    const encoded = packager.encodeSingleton(foo);
    assert.deepEqual(foo, packager.decodeSingleton(encoded));
  });

  it('entity packaging supports empty entity', async () => {
    const schema = manifest.schemas.Foo;
    const entityClass = schema.entityClass();
    const foo = new entityClass({});
    foo.identify('te st');

    const packager = new EntityPackager(schema);
    const encoded = packager.encodeSingleton(foo);
    assert.deepEqual(foo, packager.decodeSingleton(encoded));
  });

  it('entity packaging encodes collections', async () => {
    const schema = manifest.schemas.Foo;
    const entityClass = schema.entityClass();

    const make = (id, data) => {
      const foo = new entityClass(data);
      foo.identify(id);
      return foo;
    };

    const f1 = make('id1', {txt: 'abc', lnk: 'http://def', num: 9.2, flg: true});
    const f2 = make('id2|two', {});
    const f3 = make('!id:3!', {txt: 'def', num: -7});

    const packager = new EntityPackager(schema);
    const encoded = packager.encodeCollection([f1, f2, f3]);

    // Decoding of collections hasn't been implemented (yet?).
    assert.equal(encoded, '3:53:3:id1|txt:T3:abc|lnk:U10:http://def|num:N9.2:|flg:B1|10:7:id2|two|29:6:!id:3!|txt:T3:def|num:N-7:|');
  });

  it('entity packaging fails for not-yet-supported types', async () => {
    const multifest = await Manifest.parse(`
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
      entity.identify('test');
      assert.throws(() => new EntityPackager(schema).encodeSingleton(entity), 'not yet supported');
    };

    const makeRef = entityType => new Reference({id: 'i', storageKey: 'k'}, new ReferenceType(entityType), null);

    verify(multifest.schemas.BytesFail, new Uint8Array([2]));
    verify(multifest.schemas.ObjectFail, {x: 1});
    verify(multifest.schemas.UnionFail, 12);
    verify(multifest.schemas.TupleFail, ['abc', 78]);
    verify(multifest.schemas.NamedRefFail, makeRef(new EntityType(multifest.schemas.BytesFail)));
    verify(multifest.schemas.InlineRefFail, makeRef(EntityType.make(['Bar'], {val: 'Text'})));
  });

  it('schema to .proto file conversion supports basic types', async () => {
    const protoFile = await toProtoFile(manifest.schemas.Foo);

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
