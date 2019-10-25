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
import {StringDecoder} from '../wasm.js';

//  <value> depends on the field type:
//    Text       T<length>:<text>
//    URL        U<length>:<text>
//    Number     N<number>:
//    Boolean    B<zero-or-one>
//<size>:<key-len>:<key><value-len>:<value><key-len>:<key><value-len>:<value>

describe('wasm::StringDecoder', () => {
  it('decodes string values in dictionary', () => {
    const dec = new StringDecoder();
    const enc = '1:3:foo3:bar';
    const dic = dec.decodeDictionary(enc);
    //console.log(`${enc} => ${JSON.stringify(dic, null, '  ')}`);
    assert.deepEqual(dic, {foo: 'bar'});
  });
  it('decodes type-coded values in dictionary', () => {
    const dec = new StringDecoder();
    const enc = '1:3:fooT3:bar';
    const dic = dec.decodeDictionary(enc);
    //console.log(`${enc} => ${JSON.stringify(dic, null, '  ')}`);
    assert.deepEqual(dic, {foo: 'bar'});
  });
  it('decodes nested dictionaries', () => {
    const dec = new StringDecoder();
    const base = '1:3:fooT3:bar';
    const nestedEnc = `1:3:fooD${base.length}:${base}`;
    const enc = `1:3:fooD${nestedEnc.length}:${nestedEnc}`;
    const dic = dec.decodeDictionary(enc);
    //console.log(`${enc} => ${JSON.stringify(dic, null, '  ')}`);
    assert.deepEqual<{}>(dic, {foo: {foo: {foo: 'bar'}}});
  });
  it('decodes complex dictionary', () => {
    const dec = new StringDecoder();
    const data = '2:okB13:numN42:3:fooT3:bar';
    const base = `3:${data}`;
    const nestedEnc = `4:${data}3:bazD${base.length}:${base}`;
    const enc = `2:3:zotT3:zoo3:fooD${nestedEnc.length}:${nestedEnc}`;
    const dic = dec.decodeDictionary(enc);
    //console.log(`${enc} => ${JSON.stringify(dic, null, '  ')}`);
    assert.deepEqual<{}>(dic, {zot: 'zoo', foo: {ok: true, num: 42, foo: 'bar', baz: {ok: true, num: 42, foo: 'bar'}}});
  });
});
