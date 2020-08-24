/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {when} from '../../utils/hot.js';

describe('hot', () => {
  it('when combines booleans into strings', () => assert.isString(when(true, false)));
  it('when cases of different length will not be equivalent.', () => {
    assert.notEqual(when(true), when(true, true));
    assert.notEqual(when(true, false), when(false, false, false));
    switch (when(true, false)) {
      case when(true, false, false): assert.fail(); break;
      case when(true, false, true): assert.fail(); break;
      case when(true, false): assert.isOk(true); break;
      default: break;
    }
  });
  it('when reflects distinction between boolean expressions', () => {
    assert.notEqual(when(true, true), when(false, false));
    assert.notEqual(when(true, false), when(false, false));
    assert.notEqual(when(false, true), when(false, false));
    assert.notEqual(when(true, true), when(false, true));
    assert.notEqual(when(false, true), when(true, false));

    assert.strictEqual(when(false, false), when(false, false));
    assert.strictEqual(when(false, true), when(false, true));
    assert.strictEqual(when(true, false), when(true, false));
    assert.strictEqual(when(true, true), when(true, true));

    assert.notEqual(when(false, false, true), when(false, false, false));
    assert.notEqual(when(true, false, true, false), when(true, false, false, false));
    assert.strictEqual(when(true, true, true), when(true, true, true));
    assert.strictEqual(when(false, false, true, false), when(false, false, true, false));
  });
  it('when works within switch cases', () => {
    const x = 10;
    const isOdd = x % 2 === 1;
    const isDoubleDigit = x > 9;
    switch (when(isOdd, isDoubleDigit)) {
      case when(true, true): assert.fail(); break;
      case when(true, false): assert.fail(); break;
      case when(false, true): assert.isOk(true); break;
      case when(false, false): assert.fail(); break;
      default: break;
    }
  });
});
