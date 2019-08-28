/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {compareNulls} from '../../recipe/comparable.js';

describe('comparable', () => {
  it('implements compareNulls', () => {
    assert.equal(compareNulls(null, null), 0);
    assert.equal(compareNulls(null, 'cat'), -1);
    assert.equal(compareNulls('cat', null), 1);
    assert.equal(compareNulls(undefined, undefined), 0);
    assert.equal(compareNulls(undefined, null), 1);
    assert.equal(compareNulls(null, undefined), -1);
  });
});
