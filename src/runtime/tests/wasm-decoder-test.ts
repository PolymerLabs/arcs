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
//    Text       <name>:T<length>:<text>
//    URL        <name>:U<length>:<text>
//    Number     <name>:N<number>:
//    Boolean    <name>:B<zero-or-one>
//<size>:<key-len>:<key><value-len>:<value><key-len>:<key><value-len>:<value>

describe('wasm::StringDecoder', () => {
  it('decodes encoded values in dictionaries', () => {
    const dec = new StringDecoder();
    const enc = '1:3:fooT3:bar';
    const dic = dec.decodeDictionary(enc);
    assert.isNotNull(dic);
  });
  it('decodes nested dictionaries', () => {
    const dec = new StringDecoder();
    const enc = '1:3:fooT3:bar';
    const nestedEnc = `1:3:fooD${enc.length}:${enc}`;
    const nestedEnc2 = `1:3:fooD${nestedEnc.length}:${nestedEnc}`;
    const dic = dec.decodeDictionary(nestedEnc2);
    console.log(`${nestedEnc2} =>`);
    console.log(JSON.stringify(dic, null, '  '));
    assert.isNotNull(dic);
  });
});