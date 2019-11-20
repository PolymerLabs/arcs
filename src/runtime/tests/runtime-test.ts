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
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {Runtime} from '../runtime.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {ArcId} from '../id.js';
import {StubLoader} from '../testing/stub-loader.js';

// tslint:disable-next-line: no-any
function unsafe<T>(value: T): any { return value; }

function assertManifestsEqual(actual: Manifest, expected: Manifest) {
  // Delete the IdGenerator before comparing that the manifests are the same, since the IdGenerator will contain a different random session ID
  // for each Manifest instantiation.
  unsafe(expected)._idGenerator = null;
  unsafe(actual)._idGenerator = null;

  assert.deepEqual(expected, actual);
}

describe('Runtime', () => {
  it('gets an arc description for an arc', async () => {
    const arc = new Arc({slotComposer: new FakeSlotComposer(), id: ArcId.newForTest('test'), loader: new Loader(),
                         context: new Manifest({id: ArcId.newForTest('test')})});
    const description = await Description.create(arc);
    const expected = await description.getArcDescription();
    const actual = await Runtime.getArcDescription(arc);
    assert.strictEqual(expected, actual);
  });
  it('parses a Manifest', async () => {
    const content = `
    schema Text
      value: Text

    particle Hello in 'hello.js'
      text: writes Text {value}

    recipe
      handleA: create *
      Hello
        text: writes handleA`;
    const expected = await Manifest.parse(content);
    const actual = await Runtime.parseManifest(content);
    assertManifestsEqual(actual, expected);
  });
  it('loads a Manifest', async () => {
    const registry = {};
    const loader = new Loader();
    const expected = await Manifest.load('./src/runtime/tests/artifacts/test.manifest', loader, registry);
    const actual = await Runtime.loadManifest('./src/runtime/tests/artifacts/test.manifest', loader, registry);
    assertManifestsEqual(actual, expected);
  });
  it('runs arcs', async () => {
    const runtime = Runtime.getRuntime();
    assert.equal(runtime.arcById.size, 0);
    const arc = runtime.runArc('test-arc', 'volatile://');
    assert.isNotNull(arc);
    assert.hasAllKeys(runtime.arcById, ['test-arc']);
    runtime.runArc('test-arc', 'volatile://');
    assert.hasAllKeys(runtime.arcById, ['test-arc']);
    runtime.runArc('other-test-arc', 'volatile://');
    assert.hasAllKeys(runtime.arcById, ['test-arc', 'other-test-arc']);
  });
  it('registers and unregisters stores', async () => {
    const context = await Manifest.parse(``);
    const loader = new StubLoader({
      manifest: `
        schema Thing
        particle MyParticle in './my-particle.js'
          t1: writes Thing
          t2: writes Thing
          t3: writes [Thing]
        recipe
          t1: create #shared
          t2: create *
          t3: create #shared #things
          MyParticle
            t1: writes t1
            t2: writes t2
            t3: writes t3
      `,
      '*': 'defineParticle(({Particle}) => class extends Particle {});',
    });
    const runtime = new Runtime(loader, FakeSlotComposer, context);
    const arc = runtime.runArc('test-arc', 'volatile://');
    const manifest = await Manifest.load('manifest', loader);
    manifest.recipes[0].normalize();
    await arc.instantiate(manifest.recipes[0]);
    assert.lengthOf(arc.context.stores, 2);
    arc.dispose();
    assert.lengthOf(arc.context.stores, 0);
  });
});
