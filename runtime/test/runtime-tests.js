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
import {Arc} from '../ts-build/arc.js';
import {Description} from '../description.js';
import {Loader} from '../ts-build/loader.js';
import {Manifest} from '../ts-build/manifest.js';
import {Runtime} from '../ts-build/runtime.js';
import {SlotComposer} from '../slot-composer.js';

function createTestArc() {
  const slotComposer = new SlotComposer({rootContainer: 'test', affordance: 'mock'});
  let arc = new Arc({slotComposer, id: 'test'});
  return arc;
}

describe('Runtime', function() {
  it('gets an arc description for an arc', async () => {
    let arc = createTestArc();
    let description = new Description(arc);
    let expected = await description.getArcDescription();
    let actual = await Runtime.getArcDescription(arc);
    assert.equal(expected, actual);
  });
  it('parses a Manifest', async () => {
    let content = `
    schema Text
      Text value

    particle Hello in 'hello.js'
      out Text text

    recipe
      create as handleA
      Hello
        text -> handleA`;
    let expected = await Manifest.parse(content);
    let actual = await Runtime.parseManifest(content);
    assert.deepEqual(expected, actual);
  });
  it('loads a Manifest', async () => {
    let registry = {};
    let loader = new Loader();
    let expected = await Manifest.load('./runtime/test/artifacts/test.manifest', loader, registry);
    let actual = await Runtime.loadManifest('./runtime/test/artifacts/test.manifest', loader, registry);
    assert.deepEqual(expected, actual);
  });
});