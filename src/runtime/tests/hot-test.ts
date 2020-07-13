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
import {when} from '../hot.js';

describe('hot', () => {
  it('when combines booleans into integers', () => assert.isNumber(when(true, false)));
  it('when cases of different length will not be equivalent.', () => assert.notEqual(when(true), when(true, true)));
  it('when reflects distinction between boolean expressions', () => {
    assert.notEqual(when(true, true), when(false, false));
    assert.notEqual(when(true, false), when(false, false));
    assert.notEqual(when(false, true), when(false, false));
    assert.notEqual(when(true, true), when(false, true));
    assert.notEqual(when(true, true), when(true, false));
    assert.strictEqual(when(true, true), when(true, true));
  });
  it('when works within switch cases', () => {
    const x = 10;
    const isOdd = x % 2 == 1;
    const isDoubleDigit = x > 9;
    switch (when(isOdd, isDoubleDigit)) {
      case when(true, true): assert.fail(); break;
      case when(true, false): assert.fail(); break;
      case when(false, true): assert.isOk(true); break;
      case when(false, false): assert.fail(); break;
    }
  });
});
