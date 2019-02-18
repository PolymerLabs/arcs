/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {Runtime} from '../runtime.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer';

describe('Runtime', () => {
  it('gets an arc description for an arc', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: 'test', loader: new Loader(),
                         context: new Manifest({id: 'test'})});
    const description = await Description.create(arc);
    const expected = description.getArcDescription();
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
    const expected = await Manifest.load('./src/runtime/test/artifacts/test.manifest', loader, registry);
    const actual = await Runtime.loadManifest('./src/runtime/test/artifacts/test.manifest', loader, registry);
    assert.deepEqual(expected, actual);
  });
});
