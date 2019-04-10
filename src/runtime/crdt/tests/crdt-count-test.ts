/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import { CRDTCount, CRDTCountOpTypes } from '../crdt-count.js';

describe('CRDTCount', () => {

  it('initially has value 0', () => {
    const count = new CRDTCount();
    assert.equal(count.getParticleView(), 0);
  });

  it('can apply an increment op', () => {
    const count = new CRDTCount();
    count.applyOperation({type: CRDTCountOpTypes.CountIncrement, actor: 'me'});
    assert.equal(count.getParticleView(), 1);
  });

  it('can apply two increment ops from different actors', () => {
    const count = new CRDTCount();
    count.applyOperation({type: CRDTCountOpTypes.CountIncrement, actor: 'me'});
    count.applyOperation({type: CRDTCountOpTypes.CountIncrement, actor: 'them'});
    assert.equal(count.getParticleView(), 2);
  });

  it('resolves increment ops from the same', () => {
    const count = new CRDTCount();
    count.applyOperation({type: CRDTCountOpTypes.CountIncrement, actor: 'me'});
    count.applyOperation({type: CRDTCountOpTypes.CountIncrement, actor: 'them'});
    assert.equal(count.getParticleView(), 2);
  });
  
});