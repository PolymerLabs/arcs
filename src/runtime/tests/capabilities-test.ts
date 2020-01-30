/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Capabilities} from '../capabilities.js';

describe('Capabilities', () => {
  it('verifies same capabilities', () => {
    assert.isTrue(Capabilities.persistent.isSame(Capabilities.persistent));
    assert.isTrue(Capabilities.tiedToRuntime.isSame(Capabilities.tiedToRuntime));
    assert.isTrue(Capabilities.tiedToArc.isSame(Capabilities.tiedToArc));

    assert.isFalse(Capabilities.persistent.isSame(Capabilities.tiedToRuntime));
    assert.isFalse(Capabilities.tiedToRuntime.isSame(Capabilities.tiedToArc));
    assert.isFalse(Capabilities.tiedToArc.isSame(Capabilities.persistent));

    assert.isTrue(new Capabilities(['persistent', 'tied-to-arc']).isSame(
        new Capabilities(['persistent', 'tied-to-arc'])));
    assert.isFalse(new Capabilities(['persistent', 'tied-to-arc']).isSame(Capabilities.persistent));
    assert.isFalse(Capabilities.persistent.isSame(
      new Capabilities(['persistent', 'tied-to-arc'])));
  });

  it('verifies contained capabilities', () => {
    assert.isTrue(Capabilities.persistent.contains(Capabilities.persistent));
    assert.isTrue(Capabilities.tiedToRuntime.contains(Capabilities.tiedToRuntime));
    assert.isTrue(Capabilities.tiedToArc.contains(Capabilities.tiedToArc));

    assert.isFalse(Capabilities.persistent.contains(Capabilities.tiedToRuntime));
    assert.isFalse(Capabilities.tiedToRuntime.contains(Capabilities.tiedToArc));
    assert.isFalse(Capabilities.tiedToArc.contains(Capabilities.persistent));

    assert.isTrue(new Capabilities(['persistent', 'tied-to-arc']).contains(
        new Capabilities(['persistent', 'tied-to-arc'])));
    assert.isTrue(new Capabilities(['persistent', 'tied-to-arc']).contains(Capabilities.persistent));
    assert.isFalse(Capabilities.persistent.isSame(
      new Capabilities(['persistent', 'tied-to-arc'])));
  });
});
