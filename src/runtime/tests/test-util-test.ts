/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO: fix the filename... files under test starting with 'u' fail in mocha under Windows. Lol.

import {assert} from '../../platform/chai-web.js';
import {setDiff, setDiffCustom, mapToDictionary} from '../util.js';

describe('util', () => {
  it('setDiff works for basic value types', () => {
    const check = (from, to, expected) => {
      const result = setDiff(from, to);
      assert.sameDeepMembers(result.add, expected.add);
      assert.sameDeepMembers(result.remove, expected.remove);
    };

    check([], [], {add: [], remove: []});
    check(['a', 5], [5, 'a'], {add: [], remove: []});
    check([], ['a', 'b'], {add: ['a', 'b'], remove: []});
    check([4, true], [], {add: [], remove: [4, true]});
    check(['a', 'b', 7, 8], ['b', 8, 'c', 9], {add: ['c', 9], remove: [7, 'a']});
    check(['x', 'y', 3, 'x', 3, 'y'], ['z', 'x', 'z'], {add: ['z'], remove: ['y', 3]});

    // The reason for setDiffCustom... objects are compared by identity, so setDiff will always
    // consider separate value-identical instances of objects as different. Thus the following
    // looks like a complete replacement of the set:
    const from = [{a: 1}, {b: 2}];
    const to   = [{b: 2}, {c: 3}];
    check(from, to, {add: to, remove: from});
  });

  it('setDiffCustom is the same as setDiff when given the identity key function', () => {
    const check = (keyFn, from, to, expected) => {
      const result = setDiffCustom(from, to, keyFn);
      assert.sameDeepMembers(result.add, expected.add);
      assert.sameDeepMembers(result.remove, expected.remove);
    };

    const keyFn = x => x;

    check(keyFn, [], [], {add: [], remove: []});
    check(keyFn, ['a', 5], [5, 'a'], {add: [], remove: []});
    check(keyFn, [], ['a', 'b'], {add: ['a', 'b'], remove: []});
    check(keyFn, [4, true], [], {add: [], remove: [4, true]});
    check(keyFn, ['a', 'b', 7, 8], ['b', 8, 'c', 9], {add: ['c', 9], remove: [7, 'a']});
    check(keyFn, ['x', 'y', 3, 'x', 3, 'y'], ['z', 'x', 'z'], {add: ['z'], remove: ['y', 3]});

    const from = [{a: 1}, {b: 2}];
    const to   = [{b: 2}, {c: 3}];
    check(keyFn, from, to, {add: to, remove: from});
  });

  it('setDiffCustom works with JSON.stringify as the key function', () => {
    const check = (keyFn, from, to, expected) => {
      const result = setDiffCustom(from, to, keyFn);
      assert.sameDeepMembers(result.add, expected.add);
      assert.sameDeepMembers(result.remove, expected.remove);
    };

    const keyFn = JSON.stringify;

    check(keyFn, [], [], {add: [], remove: []});
    check(keyFn, ['a', {x: 5}], [{x: 5}, 'a'], {add: [], remove: []});
    check(keyFn, [], ['a', {b: 2}], {add: ['a', {b: 2}], remove: []});
    check(keyFn, [{a: 1}, 6], [], {add: [], remove: [{a: 1}, 6]});

    check(keyFn, [true, {a: 1}, 7, {a: 1}, {b: 2}],
                 [9, {b: 2}, 7, {c: 3}, 'x', {c: 3}],
                 {add: [9, 'x', {c: 3}], remove: [true, {a: 1}]});

    check(keyFn, [{a: 1}, {a: 2}, {b: 3}],
                 [{a: 1}, {b: 4}],
                 {add: [{b: 4}], remove: [{a: 2}, {b: 3}]});
  });

  it('setDiffCustom works with an object-specific key function', () => {
    const check = (keyFn, from, to, expected) => {
      const result = setDiffCustom(from, to, keyFn);
      assert.sameDeepMembers(result.add, expected.add);
      assert.sameDeepMembers(result.remove, expected.remove);
    };

    const keyFn = x => `${x.a}:${x.b}`;

    check(keyFn, [], [], {add: [], remove: []});
    check(keyFn, [{a: 1, b: 2}, {a: 7}], [{a: 7}, {b: 2, a: 1}], {add: [], remove: []});

    check(keyFn, [], [{a: 5}, {b: 9}], {add: [{a: 5}, {b: 9}], remove: []});
    check(keyFn, [{a: 7, b: 3}], [], {add: [], remove: [{b: 3, a: 7}]});

    check(keyFn, [{a: 1, b: 2}], [{a: 1}], {add: [{a: 1}], remove: [{a: 1, b: 2}]});
    check(keyFn, [{b: 8}], [{a: 5, b: 8}], {add: [{a: 5, b: 8}], remove: [{b: 8}]});

    check(keyFn, [{a: 1, b: 2}], [{a: 6, b: 2}], {add: [{a: 6, b: 2}], remove: [{a: 1, b: 2}]});
    check(keyFn, [{a: 1, b: 2}], [{a: 1, b: 6}], {add: [{a: 1, b: 6}], remove: [{a: 1, b: 2}]});

    // Duplicate objects are handled correctly.
    check(keyFn, [{a: 9, b: 8}, {a: 7}, {b: 6}, {a: 9, b: 8}, {b: 6}],
                 [{a: 9, b: 8}, {a: 1}, {a: 4, b: 6}],
                 {add: [{a: 1}, {a: 4, b: 6}], remove: [{a: 7}, {b: 6}]});

    // Extra fields are ignored.
    check(keyFn, [{a: 1, b: 2, c: 3}], [{a: 1, b: 2, c: 4}], {add: [], remove: []});
  });

  it('mapToDictionary works with an empty Map', () => {
    const dict = mapToDictionary(new Map());
    assert.deepEqual(dict, {});
  });

  it('mapToDictionary works with a Map with values', () => {
    const map: Map<string, number> = new Map();
    map.set('abc', 123);
    map.set('def', 456);
    const dict = mapToDictionary(map);
    assert.deepEqual(dict, {abc: 123, def: 456});
  });
});
