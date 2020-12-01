/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {compareNulls, compareStrings, compareNumbers, compareBools,
        compareArrays, compareObjects, Comparable, compareComparables} from '../lib-utils.js';

class Thing implements Comparable<Thing> {
  constructor(readonly s: string|null, readonly n: number|null) {}

  _compareTo(other: Thing): number {
    let cmp: number;
    if ((cmp = compareStrings(this.s, other.s)) !== 0) return cmp;
    if ((cmp = compareNumbers(this.n, other.n)) !== 0) return cmp;
    return 0;
  }
}

describe('comparable', () => {
  it('implements compareNulls', () => {
    assert.equal(compareNulls(null, null), 0);
    assert.equal(compareNulls(null, 'cat'), -1);
    assert.equal(compareNulls('cat', null), 1);
    assert.equal(compareNulls(undefined, undefined), 0);
    assert.equal(compareNulls(undefined, null), 1);
    assert.equal(compareNulls(null, undefined), -1);
  });

  it('implements compareStrings', () => {
    assert.equal(compareStrings(null, null), 0);
    assert.equal(compareStrings(null, 'aardvark'), -1);
    assert.equal(compareStrings('aardvark', null), 1);
    assert.equal(compareStrings('aardvark', 'aardvark'), 0);
    assert.equal(compareStrings('aardvark', 'zebra'), -1);
    assert.equal(compareStrings('zebra', 'aardvark'), 1);
  });

  it('implements compareNumbers', () => {
    assert.equal(compareNumbers(null, null), 0);
    assert.equal(compareNumbers(null, 3), -1);
    assert.equal(compareNumbers(3, null), 1);
    assert.equal(compareNumbers(3, 3), 0);
    assert.equal(compareNumbers(3, 7), -4);
    assert.equal(compareNumbers(7, 3), 4);
  });

  it('implements compareBools', () => {
    assert.equal(compareBools(null, null), 0);
    assert.equal(compareBools(null, false), -1);
    assert.equal(compareBools(false, null), 1);
    assert.equal(compareBools(false, false), 0);
    assert.equal(compareBools(false, true), -1);
    assert.equal(compareBools(true, false), 1);
    assert.equal(compareBools(true, true), 0);
  });

  it('implements compareArrays', () => {
    assert.equal(compareArrays([], [], compareNumbers), 0);
    assert.equal(compareArrays([], [2, 5], compareNumbers), -2);
    assert.equal(compareArrays(['a'], [], compareStrings), 1);
    assert.equal(compareArrays([2, 5, 1], [2, 5, 1], compareNumbers), 0);
    assert.equal(compareArrays([2, 5, 1], [2, 9, 1], compareNumbers), -4);
    assert.equal(compareArrays(['r', 'm'], ['g', 'm'], compareStrings), 1);
    assert.equal(compareArrays([false, false, true], [false, false, false], compareBools), 1);
  });

  it('implements compareObjects', () => {
    assert.equal(compareObjects({}, {}, compareNumbers), 0);
    assert.equal(compareObjects({}, {x: 1}, compareNumbers), -1);
    assert.equal(compareObjects({x: 'a', y: 'b'}, {}, compareStrings), 2);
    assert.equal(compareObjects({x: 2, y: 5, z: 1}, {x: 2, y: 5, z: 1}, compareNumbers), 0);
    assert.equal(compareObjects({x: 2, y: 5, z: 1}, {x: 2, y: 9, z: 1}, compareNumbers), -4);
    assert.equal(compareObjects({x: 'r', y: 'm'}, {x: 'g', y: 'm'}, compareStrings), 1);
    assert.equal(compareObjects({x: false, y: false}, {x: true, y: false}, compareBools), -1);
    assert.equal(compareObjects({x: 2, y: 5, z: 1}, {x: 2, z: 1}, compareNumbers), 1);
    assert.equal(compareObjects({y: 5}, {x: 2, y: 5, z: 1}, compareNumbers), -2);
  });

  it('implements compareComparables', () => {
    assert.equal(compareComparables(null, null), 0);
    assert.equal(compareComparables(null, new Thing('a', 1)), -1);
    assert.equal(compareComparables(new Thing('a', 1), null), 1);
    assert.equal(compareComparables(new Thing(null, null), new Thing(null, null)), 0);
    assert.equal(compareComparables(new Thing('a', null), new Thing('a', null)), 0);
    assert.equal(compareComparables(new Thing('a', 10), new Thing('a', 10)), 0);
    assert.equal(compareComparables(new Thing('z', 10), new Thing('a', 10)), 1);
    assert.equal(compareComparables(new Thing('a', 15), new Thing('a', 10)), 5);
    assert.equal(compareComparables(new Thing('a', 10), new Thing('z', 10)), -1);
    assert.equal(compareComparables(new Thing('a', 10), new Thing('a', 15)), -5);
  });
});
