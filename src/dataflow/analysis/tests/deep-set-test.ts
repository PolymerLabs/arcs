/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {DeepSet} from '../deep-set.js';
import {assert} from '../../../platform/chai-web.js';

class TestElement {
  constructor(readonly elem: number) {}

  toUniqueString() {
    return this.elem + '!';
  }
}

/** Wraps each given number element into a TestElement, and then creates a new DeepSet out of them. */
function newTestSet(...elements: number[]): DeepSet<TestElement> {
  return new DeepSet(...elements.map(e => new TestElement(e)));
}

/** Takes the given DeepSet, and unwraps every TestElement object inside it into a raw number. */
function unwrapSet(set: DeepSet<TestElement>): number[] {
  return set.toArray().map(e => e.elem);
}

describe('DeepSet', () => {
  it('can construct an empty set', () => {
    const set = newTestSet();
    assert.isEmpty(set.asSet());
    assert.equal(set.size, 0);
  });

  it('can construct a set from given elements', () => {
    const set = newTestSet(1, 2, 3);
    assert.deepEqual(unwrapSet(set), [1, 2, 3]);
  });

  it('ignores duplicates when constructing the set', () => {
    const set = newTestSet(1, 1, 2);
    assert.deepEqual(unwrapSet(set), [1, 2]);
  });

  it('ignores duplicates when adding elements', () => {
    const set = newTestSet(1, 2);
    assert.equal(set.size, 2);
    set.add(new TestElement(3));
    assert.equal(set.size, 3);
    set.add(new TestElement(3));
    assert.equal(set.size, 3);
  });

  it('ignores duplicates when adding sets of elements', () => {
    const set1 = newTestSet(1, 2);
    const set2 = newTestSet(2, 3);

    set1.addAll(set2);

    assert.deepEqual(unwrapSet(set1), [1, 2, 3]);
  });

  it('is iterable', () => {
    const set = newTestSet(1, 2, 3);
    const result: TestElement[] = [];
    for (const elem of set) {
      result.push(elem);
    }
    assert.deepEqual(result, [new TestElement(1), new TestElement(2), new TestElement(3)]);
  });

  it('map() creates a transformed copy without duplicates', () => {
    const original = newTestSet(1, 2, 3, 4, 5);
    const halved = original.map(e => new TestElement(Math.floor(e.elem / 2)));

    assert.deepEqual(unwrapSet(original), [1, 2, 3, 4, 5]);
    assert.deepEqual(unwrapSet(halved), [0, 1, 2]);
  });

  it('has a unique string representation', () => {
    const set = newTestSet(3, 2, 1);
    assert.equal(set.toUniqueString(), '{1!, 2!, 3!}');
  });
});
