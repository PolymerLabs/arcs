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
import {checkDefined, checkNotNull} from '../preconditions.js';

describe('precondtions', () => {
  const delay = async (ms: number) => new Promise(r => setTimeout(r, ms));

  it('throws when it should', () => {
    const msg = 'custom error message';
    assert.throws(() => checkDefined(undefined, msg), msg);
    assert.throws(() => checkNotNull(null, msg), msg);
  });

  it('passes values when valid', () => {
    const value = 'defined value';
    const msg = 'custom error message';
    
    assert.equal(value, checkDefined(value, msg));
    assert.equal(value, checkNotNull(value, msg));
    assert.isUndefined(checkNotNull(undefined, msg));
  });
});
