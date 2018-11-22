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
import {Description} from '../ts-build/description.js';
import {Loader} from '../ts-build/loader.js';
import {Manifest} from '../ts-build/manifest.js';
import {Runtime} from '../ts-build/runtime.js';
import {SlotComposer} from '../ts-build/slot-composer.js';

function createTestArc() {
  const slotComposer = new SlotComposer({rootContainer: 'test', modality: 'mock'});
  const arc = new Arc({slotComposer, id: 'test'});
  return arc;
}

describe('Runtime', function() {
  it('gets an arc description for an arc', async () => {
    const arc = createTestArc();
    const description = new Description(arc);
    const expected = await description.getArcDescription();
    const actual = await Runtime.getArcDescription(arc);
    assert.equal(expected, actual);
  });
  it('parses a Manifest', async () => {
    const content = `
    schema Text
      Text value

    particle Hello in 'hello.js'
      out Text text

    recipe
      create as handleA
      Hello
        text -> handleA`;
    const expected = await Manifest.parse(content);
    const actual = await Runtime.parseManifest(content);
    assert.deepEqual(expected, actual);
  });
  it('loads a Manifest', async () => {
    const registry = {};
    const loader = new Loader();
    const expected = await Manifest.load('./runtime/test/artifacts/test.manifest', loader, registry);
    const actual = await Runtime.loadManifest('./runtime/test/artifacts/test.manifest', loader, registry);
    assert.deepEqual(expected, actual);
  });
});
