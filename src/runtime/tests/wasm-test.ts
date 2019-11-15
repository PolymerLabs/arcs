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
import {Manifest} from '../manifest.js';
import {EntityType, ReferenceType} from '../type.js';
import {Entity} from '../entity.js';
import {Reference} from '../reference.js';
import {StringEncoder, StringDecoder} from '../wasm.js';
import {BiMap} from '../bimap.js';

async function setup() {
  const manifest = await Manifest.parse(`
    schema Foo
      Text txt
      URL lnk
      Number num
      Boolean flg
      Reference<Bar {Text a}> ref
    `);
  const fooClass = manifest.schemas.Foo.entityClass();
  const barType = EntityType.make(['Bar'], {a: 'Text'});

  const typeMap = new BiMap<number, EntityType>();
  const encoder = StringEncoder.create(fooClass.type, typeMap);
  const decoder = StringDecoder.create(fooClass.type, typeMap, null);
  return {fooClass, barType, encoder, decoder, typeMap};
}

describe('wasm', () => {
  it('entity packaging supports primitive field types and references', async () => {
    const {fooClass, barType, encoder, decoder, typeMap} = await setup();
    const ref = new Reference({id: 'i', storageKey: 'k'}, new ReferenceType(barType), null);
    const foo = new fooClass({txt: 'abc', lnk: 'http://def', num: 37, flg: true, ref});
    Entity.identify(foo, 'test');

    const encoded = encoder.encodeSingleton(foo);
    assert.deepStrictEqual([...typeMap.entries()], [[1, barType]]);

    const foo2 = decoder.decodeSingleton(encoded);
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports partially assigned entity', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({txt: 'abc', num: -5.1});
    Entity.identify(foo, '!test:foo:bar|');

    const encoded = encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded);
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports zero and empty values', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({txt: '', lnk: '', num: 0, flg: false});
    Entity.identify(foo, 'te|st');

    const encoded = encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded);
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging supports empty entity', async () => {
    const {fooClass, encoder, decoder} = await setup();
    const foo = new fooClass({});
    Entity.identify(foo, 'te st');

    const encoded = encoder.encodeSingleton(foo);
    const foo2 = decoder.decodeSingleton(encoded);
    assert.deepStrictEqual(foo, foo2);
  });

  it('entity packaging encodes collections', async () => {
    const {fooClass, barType, encoder, decoder, typeMap} = await setup();
    const make = (id, data) => {
      const foo = new fooClass(data);
      Entity.identify(foo, id);
      return foo;
    };
    const ref = new Reference({id: 'r1', storageKey: 'k1'}, new ReferenceType(barType), null);
    const f1 = make('id1', {txt: 'abc', lnk: 'http://def', num: 9.2, flg: true, ref});
    const f2 = make('id2|two', {});
    const f3 = make('!id:3!', {txt: 'def', num: -7});

    const encoded = encoder.encodeCollection([f1, f2, f3]);

    // Decoding of collections hasn't been implemented (yet?).
    assert.strictEqual(encoded,
      '3:' +
      '71:3:id1|txt:T3:abc|lnk:U10:http://def|num:N9.2:|flg:B1|ref:R2:r1|2:k1|1:|' +
      '10:7:id2|two|' +
      '29:6:!id:3!|txt:T3:def|num:N-7:|');
  });

  it('entity packaging fails for not-yet-supported types', async () => {
    const multifest = await Manifest.parse(`
      schema BytesFail
        Bytes value
      schema UnionFail
        (Text or URL or Number) value
      schema TupleFail
        (Text, Number) value
      `);

    const verify = (schema, value) => {
      const entityClass = schema.entityClass();
      const e = new entityClass({value});
      Entity.identify(e, 'test');
      assert.throws(() => StringEncoder.create(entityClass.type, null).encodeSingleton(e), 'not yet supported');
    };

    verify(multifest.schemas.BytesFail, new Uint8Array([2]));
    verify(multifest.schemas.UnionFail, 12);
    verify(multifest.schemas.TupleFail, ['abc', 78]);
  });

  it('decodes string values in dictionary', () => {
    const enc = '1:3:foo3:bar';
    const dic = StringDecoder.decodeDictionary(enc);
    assert.deepStrictEqual(dic, {foo: 'bar'});
  });

  it('decodes type-coded values in dictionary', () => {
    const enc = '1:3:fooT3:bar';
    const dic = StringDecoder.decodeDictionary(enc);
    assert.deepStrictEqual(dic, {foo: 'bar'});
  });

  it('decodes nested dictionaries', () => {
    const base = '1:3:fooT3:bar';
    const nestedEnc = `1:3:fooD${base.length}:${base}`;
    const enc = `1:3:fooD${nestedEnc.length}:${nestedEnc}`;
    const dic = StringDecoder.decodeDictionary(enc);
    assert.deepStrictEqual<{}>(dic, {foo: {foo: {foo: 'bar'}}});
  });

  it('decodes complex dictionary', () => {
    const data = '2:okB13:numN42:3:fooT3:bar';
    const base = `3:${data}`;
    const nestedEnc = `4:${data}3:bazD${base.length}:${base}`;
    const enc = `2:3:zotT3:zoo3:fooD${nestedEnc.length}:${nestedEnc}`;
    const dic = StringDecoder.decodeDictionary(enc);
    assert.deepStrictEqual<{}>(dic, {
      zot: 'zoo',
      foo: {
        ok: true, num: 42, foo: 'bar', baz: {ok: true, num: 42, foo: 'bar'}
      }
    });
  });

  it('decodes array', () => {
    const str = '3:D27:2:4:nameT4:Jill3:ageT4:70.0D27:2:4:nameT4:Jack3:ageT4:25.0D26:2:4:nameT3:Jen3:ageT4:50.0';
    const list = StringDecoder.decodeArray(str);
    assert.deepStrictEqual<{}>(list, [
        {name: 'Jill', age: '70.0'},
        {name: 'Jack', age: '25.0'},
        {name: 'Jen', age: '50.0'}
    ]);
  });
});
