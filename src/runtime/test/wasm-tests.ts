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
import {EntityProtoConverter} from '../wasm.js';
import {Manifest} from '../manifest.js';
import protobufjs from 'protobufjs';

describe('wasm', () => {

  let schema;
  before(async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        Text      txt
        URL       lnk
        Number    num
        Boolean   flg
        [Text]    c_txt
        [URL]     c_lnk
        [Number]  c_num
        [Boolean] c_flg`);
    schema = manifest.findSchemaByName('Foo');
  });

  it('entity to proto conversion supports basic types', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({
      txt: 'abc',
      lnk: 'http://def',
      num: 37,
      flg: true,
      c_txt: ['g', 'h'],
      c_lnk: ['http://ijk', 'http://lmn'],
      c_num: [51, 73, 26],
      c_flg: [false, true]
    });

    const epc = new EntityProtoConverter(schema);
    const buffer = epc.encode(foo);
    const copy = epc.decode(buffer);
    assert.deepEqual(foo, copy);
  });

  it('entity to proto conversion supports partially assigned values', async () => {
    const entityClass = schema.entityClass();
    const foo = new entityClass({txt: 'abc', c_num: [51, 73]});

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
      flg: false,
      c_txt: new Set(),
      c_lnk: new Set(),
      c_num: new Set(),
      c_flg: new Set()
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
      schema BytesCollectionFail
        [Bytes] foo
      schema ObjectCollectionFail
        [Object] foo
      schema UnionCollectionFail
        [(Text or Bytes)] foo
      schema TupleCollectionFail
        [(Number, Object)] foo
      schema NestedCollectionFail
        [[Text]] foo
      schema NamedRefFail
        Reference<BytesFail> foo
      schema InlineRefFail
        Reference<Bar {Text val}> foo`);

    for (const schema of Object.values(manifest.schemas)) {
      assert.throws(() => new EntityProtoConverter(schema), 'not yet supported');
    }
  });
});
