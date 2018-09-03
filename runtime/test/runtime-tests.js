/**
* @license
* Copyright (c) 2018 Google Inc. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* Code distributed by Google as part of this project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

import {assert} from './chai-web.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {Runtime} from '../ts-build/runtime.js';
import {SlotComposer} from '../slot-composer.js';

function createTestArc() {
  const slotComposer = new SlotComposer({rootContainer: 'test', affordance: 'mock'});
  let arc = new Arc({slotComposer, id: 'test'});
  return arc;
}

describe('Runtime', function() {
  it('getting arc description', async () => {
    let arc = createTestArc();
    let description = new Description(arc);
    let expected = await description.getArcDescription();
    let actual = await Runtime.getArcDescription(arc);
    assert.equal(expected, actual);
  });
});