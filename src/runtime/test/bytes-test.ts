/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Bytes} from '../bytes.js';

// Small Red Dot from https://en.wikipedia.org/wiki/Data_URI_scheme
const RED_DOT_DATA_URI = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

describe('bytes', () => {
  it('creates a Bytes object', () => {
    const b = new Bytes(RED_DOT_DATA_URI);
    assert.isNotNull(b);
    const content = b.content();
    assert.isNotNull(content);
    assert(b.toString(), '');
  });
});
