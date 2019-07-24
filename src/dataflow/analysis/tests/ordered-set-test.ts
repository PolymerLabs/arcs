/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {OrderedSet} from '../ordered-set.js';
import {assert} from '../../../platform/chai-web.js';

describe('OrderedSet', () => {
  it('starts off empty', () => {
    const set = new OrderedSet<string>();
    assert.isEmpty(set.set);
    assert.isEmpty(set.list);
  });

  it('can add multiple elements', () => {
    const set = new OrderedSet<string>();

    set.add('a');
    set.add('b');
    set.add('a');

    assert.hasAllDeepKeys(set.set, ['a', 'b']);
    assert.deepEqual(set.list, ['a', 'b', 'a']);
  });

  it('can add elements from another OrderedSet', () => {
    const first = new OrderedSet<string>();
    first.add('a');
    first.add('b');

    const second = new OrderedSet<string>();
    second.add('a');
    second.add('c');
    second.addAll(first);

    assert.hasAllDeepKeys(second.set, ['a', 'b', 'c']);
    assert.deepEqual(second.list, ['a', 'c', 'a', 'b']);
  });

  it('can check if an element exists', () => {
    const set = new OrderedSet<string>();
    assert.isFalse(set.has('a'));
    set.add('a');
    assert.isTrue(set.has('a'));
  });

  it('can make a copy of itself', () => {
    const original = new OrderedSet<string>();
    original.add('a');
    original.add('b');

    const copy = original.copy();
    copy.add('c');

    assert.isTrue(copy.has('c'));
    assert.isFalse(original.has('c'));
  });

  it('is iterable', () => {
    const set = new OrderedSet<string>();
    set.add('a');
    set.add('b');

    assert.deepEqual([...set], ['a', 'b']);
  });

  it('reports the length of its list', () => {
    const original = new OrderedSet<string>();
    assert.strictEqual(original.length, 0);
    original.add('a');
    assert.strictEqual(original.length, 1);
    original.add('a');
    assert.strictEqual(original.length, 2);
  });
});
