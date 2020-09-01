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
import {BiMap} from '../lib-utils.js';

describe('BiMap', () => {
  it('supports standard map operations', () => {
    const b = new BiMap<number, string>();
    assert.strictEqual(b.size, 0);

    assert.strictEqual(b.set(12, 'twelve'), b);
    b.set(8, 'eight');
    b.set(20, 'twenty');
    b.set(40, 'forty');
    b.set(15, 'fifteen');
    assert.strictEqual(b.size, 5);

    assert.isTrue(b.hasL(8));
    assert.isTrue(b.hasR('twelve'));
    assert.strictEqual(b.getL(8), 'eight');
    assert.strictEqual(b.getR('twelve'), 12);

    assert.isFalse(b.hasL(99));
    assert.isFalse(b.hasR('nope'));
    assert.isUndefined(b.getL(99));
    assert.isUndefined(b.getR('nope'));

    assert.isTrue(b.deleteL(20));
    assert.isFalse(b.deleteL(20));

    assert.isTrue(b.deleteR('forty'));
    assert.isFalse(b.deleteR('forty'));

    assert.deepStrictEqual([...b.lefts()], [12, 8, 15]);
    assert.deepStrictEqual([...b.rights()], ['twelve', 'eight', 'fifteen']);
    assert.deepStrictEqual([...b.entries()], [[12, 'twelve'], [8, 'eight'], [15, 'fifteen']]);

    const res = [];
    b.forEach((left, right, map) => {
      res.push(left + ':' + right);
      assert.strictEqual(map, b);
    });
    assert.deepStrictEqual(res, ['12:twelve', '8:eight', '15:fifteen']);

    b.clear();
    assert.strictEqual(b.size, 0);
    assert.isEmpty([...b.entries()]);
  });

  it('rebinding an existing entry discards the old associated value', () => {
    const b = new BiMap<number, string>();
    b.set(7, 'six');
    b.set(7, 'seven');
    b.set(8, 'four');
    b.set(4, 'four');

    assert.deepStrictEqual([...b.lefts()], [7, 4]);
    assert.deepStrictEqual([...b.rights()], ['seven', 'four']);
    assert.deepStrictEqual([...b.entries()], [[7, 'seven'], [4, 'four']]);
  });

  it('can be constructed from an iterable', () => {
    const b1 = new BiMap<number, string>([
      [5, 'five'], [3, 'oops'], [25, 'zero'], [3, 'three'], [0, 'zero']
    ]);

    const expected = [[5, 'five'], [3, 'three'], [0, 'zero']];
    assert.deepStrictEqual([...b1.entries()], expected);

    const b2 = new BiMap<number, string>(b1.entries());
    assert.deepStrictEqual([...b2.entries()], expected);
  });
});
