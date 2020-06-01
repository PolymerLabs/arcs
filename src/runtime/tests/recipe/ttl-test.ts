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
import {Ttl, TtlUnits} from '../../recipe/ttl.js';

describe('Ttl', () => {
  it('roundtrips ttl', () => {
    const ttl3m = Ttl.fromString('3m');
    assert.equal(ttl3m.count, 3);
    assert.equal(ttl3m.units, TtlUnits.Minute);
    assert.equal(ttl3m.toString(), '3m');
    assert.equal(new Ttl(5, TtlUnits.Day).toString(),
                 Ttl.fromString('5d').toString());
  });

  it('calculates ttl', () => {
    const start = new Date();
    const ttl2dStr = '2d';
    const ttl2d = Ttl.fromString(ttl2dStr);
    assert.equal(ttl2d.toString(), ttl2dStr);
    const exp2d = ttl2d.calculateExpiration(start);
    assert.isTrue(start.getTime() < exp2d.getTime());

    const ttl48hStr = '48h';
    const ttl48h = Ttl.fromString(ttl48hStr);
    assert.equal(ttl48h.toString(), ttl48hStr);
    const exp48h = ttl48h.calculateExpiration(start);
    assert.equal(exp2d.getTime(), exp48h.getTime());

    const ttl60mStr = '60m';
    const ttl60m = Ttl.fromString(ttl60mStr);
    assert.equal(ttl60m.toString(), ttl60mStr);
    assert.equal(
      Ttl.fromString('2h').calculateExpiration(start).getTime(),
      ttl60m.calculateExpiration(ttl60m.calculateExpiration(start)).getTime());
  });
});
