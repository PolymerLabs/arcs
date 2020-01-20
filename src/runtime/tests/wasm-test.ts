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
import {TextEncoder, TextDecoder} from '../../platform/text-encoder-web.js';
import {Manifest} from '../manifest.js';
import {EntityType, ReferenceType} from '../type.js';
import {Entity} from '../entity.js';
import {Reference} from '../reference.js';
import {StringEncoder, StringDecoder, DynamicBuffer} from '../wasm.js';
import {BiMap} from '../bimap.js';
import {assertThrowsAsync} from '../../testing/test-util.js';

async function setup() {
  const manifest = await Manifest.parse(`
    schema Foo
      txt: Text
      lnk: URL
      num: Number
      flg: Boolean
      ref: &Bar {a: Text}
    `);
  const fooClass = Entity.createEntityClass(manifest.schemas.Foo, null);
  const barType = EntityType.make(['Bar'], {a: 'Text'});

  const typeMap = new BiMap<string, EntityType>();
  const encoder = StringEncoder.create(fooClass.type);
  const decoder = StringDecoder.create(fooClass.type, typeMap, null);
  return {fooClass, barType, encoder, decoder, typeMap};
}

describe('wasm', () => {
  it('entity packaging supports primitive field types and references', async () => {
    const {fooClass, barType, encoder, decoder, typeMap} = await setup();
    const ref = new Reference({id: 'i', entityStorageKey: 'k'}, new ReferenceType(barType), null);
    const foo = new fooClass({txt: 'abc', lnk: 'http://def', num: 37, flg: true, ref});
    Entity.identify(foo, 'test', null);

    typeMap.set(await barType.getEntitySchema().hash(), barType);

    const encoded = await encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded.view());
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports partially assigned entity', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({txt: 'abc', num: -5.1});
    Entity.identify(foo, '!test:foo:bar|', null);

    const encoded = await encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded.view());
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports zero and empty values', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({txt: '', lnk: '', num: 0, flg: false});
    Entity.identify(foo, 'te|st', null);

    const encoded = await encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded.view());
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports empty entity', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({});
    Entity.identify(foo, 'te st', null);

    const encoded = await encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded.view());
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging encodes collections', async () => {
    const {fooClass, barType, encoder, decoder, typeMap} = await setup();
    const make = (id, data) => {
      const foo = new fooClass(data);
      Entity.identify(foo, id, null);
      return foo;
    };
    const ref = new Reference({id: 'r1', entityStorageKey: 'k1'}, new ReferenceType(barType), null);
    const f1 = make('id1', {txt: 'abc', lnk: 'http://def', num: 9.2, flg: true, ref});
    const f2 = make('id2|two', {});
    const f3 = make('!id:3!', {txt: 'def', num: -7});

    const hash = await barType.getEntitySchema().hash();
    const encoded = await encoder.encodeCollection([f1, f2, f3]);

    // Decoding of collections hasn't been implemented (yet?).
    assert.strictEqual(new TextDecoder().decode(encoded.view()),
      '3:' +
      '110:3:id1|txt:T3:abc|lnk:U10:http://def|num:N9.2:|flg:B1|ref:R2:r1|2:k1|' + hash + ':|' +
      '10:7:id2|two|' +
      '29:6:!id:3!|txt:T3:def|num:N-7:|');
  });

  it('entity packaging fails for not-yet-supported types', async () => {
    const multifest = await Manifest.parse(`
      schema BytesFail
        value: Bytes
      schema UnionFail
        value: (Text or URL or Number)
      schema TupleFail
        value: (Text, Number)
      `);

    const verify = (schema, value) => {
      const entityClass = Entity.createEntityClass(schema, null);
      const e = new entityClass({value});
      Entity.identify(e, 'test', null);
      assertThrowsAsync(async () => {
        await StringEncoder.create(entityClass.type).encodeSingleton(e);
      }, 'not yet supported');
    };

    verify(multifest.schemas.BytesFail, new Uint8Array([2]));
    verify(multifest.schemas.UnionFail, 12);
    verify(multifest.schemas.TupleFail, ['abc', 78]);
  });

  it('decodes string values in dictionary', () => {
    const str = '1:3:foo3:bar';
    const dic = StringDecoder.decodeDictionary(new TextEncoder().encode(str));
    assert.deepStrictEqual(dic, {foo: 'bar'});
  });

  it('decodes type-coded values in dictionary', () => {
    const str = '1:3:fooT3:bar';
    const dic = StringDecoder.decodeDictionary(new TextEncoder().encode(str));
    assert.deepStrictEqual(dic, {foo: 'bar'});
  });

  it('decodes nested dictionaries', () => {
    const base = '1:3:fooT3:bar';
    const nested = `1:3:fooD${base.length}:${base}`;
    const str = `1:3:fooD${nested.length}:${nested}`;
    const dic = StringDecoder.decodeDictionary(new TextEncoder().encode(str));
    assert.deepStrictEqual<{}>(dic, {foo: {foo: {foo: 'bar'}}});
  });

  it('decodes complex dictionary', () => {
    const data = '2:okB13:numN42:3:fooT3:bar';
    const base = `3:${data}`;
    const nested = `4:${data}3:bazD${base.length}:${base}`;
    const str = `2:3:zotT3:zoo3:fooD${nested.length}:${nested}`;
    const dic = StringDecoder.decodeDictionary(new TextEncoder().encode(str));
    assert.deepStrictEqual<{}>(dic, {
      zot: 'zoo',
      foo: {
        ok: true, num: 42, foo: 'bar', baz: {ok: true, num: 42, foo: 'bar'}
      }
    });
  });

  it('decodes array', () => {
    const str = '3:D27:2:4:nameT4:Jill3:ageT4:70.0D27:2:4:nameT4:Jack3:ageT4:25.0D26:2:4:nameT3:Jen3:ageT4:50.0';
    const list = StringDecoder.decodeArray(new TextEncoder().encode(str));
    assert.deepStrictEqual<{}>(list, [
        {name: 'Jill', age: '70.0'},
        {name: 'Jack', age: '25.0'},
        {name: 'Jen', age: '50.0'}
    ]);
  });

  it('DynamicBuffer supports ascii, unicode and other DynamicBuffers', () => {
    const decoder = new TextDecoder();

    const b1 = new DynamicBuffer(1);
    b1.addAscii('abc', '!!');
    assert.strictEqual(decoder.decode(b1.view()), 'abc!!');

    const b2 = new DynamicBuffer(1);
    b2.addUnicode('-⛲-');
    assert.strictEqual(decoder.decode(b2.view()), '5:-⛲-');

    b1.addBytes(b2);
    assert.strictEqual(decoder.decode(b1.view()), 'abc!!7:5:-⛲-');
  });

  it('DynamicBuffer resizes for large inputs', () => {
    const decoder = new TextDecoder();
    const str = 'abcdefghijklmnopqrstuvwxyz_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789';
    const input = str + str + str;

    const b1 = new DynamicBuffer(2);
    b1.addAscii(input);
    assert.strictEqual(decoder.decode(b1.view()), input);

    const b2 = new DynamicBuffer(3);
    b2.addUnicode(input);
    assert.strictEqual(decoder.decode(b2.view()), `192:${input}`);

    const b3 = new DynamicBuffer(5);
    b3.addBytes(b2);
    assert.strictEqual(decoder.decode(b3.view()), `196:192:${input}`);
  });
});
