/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Ttl} from '../../recipe/ttl.js';

describe('Ttl', () => {
  it('calculates ttl', () => {
    const start = new Date();
    const ttl20d = Ttl.fromString('2d');
    const exp20d = ttl20d.calculateExpiration(start);
    assert.isTrue(start.getTime() < exp20d.getTime());
    const ttl48h = Ttl.fromString('48h');
    const exp48h = ttl48h.calculateExpiration(start);
    assert.equal(exp20d.getTime(), exp48h.getTime());

    const ttl60m = Ttl.fromString('60m');
    assert.equal(
      Ttl.fromString('2h').calculateExpiration(start).getTime(),
      ttl60m.calculateExpiration(ttl60m.calculateExpiration(start)).getTime());
  });
});
