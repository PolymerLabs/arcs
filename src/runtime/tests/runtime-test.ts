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
import {SlotComposer} from '../slot-composer.js';
import {ArcId} from '../id.js';
import {RamDiskStorageDriverProvider} from '../storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {ramDiskStorageKeyPrefixForTest, volatileStorageKeyPrefixForTest} from '../testing/handle-for-test.js';
import {Flags} from '../flags.js';

// tslint:disable-next-line: no-any
function unsafe<T>(value: T): any { return value; }

function assertManifestsEqual(actual: Manifest, expected: Manifest) {
  // Delete the IdGenerator before comparing that the manifests are the same, since the IdGenerator will contain a different random session ID
  // for each Manifest instantiation.
  unsafe(expected).idGenerator = null;
  unsafe(actual).idGenerator = null;

  assert.deepEqual(expected, actual);
}

describe('Runtime', () => {
  it('gets an arc description for an arc', async () => {
    const arc = new Arc({
      slotComposer: new SlotComposer(),
      id: ArcId.newForTest('test'),
      loader: new Loader(),
      context: new Manifest({id: ArcId.newForTest('test')})
    });
    const description = await Description.create(arc);
    const expected = await description.getArcDescription();
    const actual = await Runtime.getArcDescription(arc);
    assert.strictEqual(expected, actual);
  });
  it('parses a Manifest', async () => {
    const content = `
    schema Greeting
      value: Text

    particle Hello in 'hello.js'
      text: writes Greeting {value}

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
    const arc = runtime.runArc('test-arc', volatileStorageKeyPrefixForTest());
    assert.isNotNull(arc);
    assert.hasAllKeys(runtime.arcById, ['test-arc']);
    runtime.runArc('test-arc', volatileStorageKeyPrefixForTest());
    assert.hasAllKeys(runtime.arcById, ['test-arc']);
    runtime.runArc('other-test-arc', volatileStorageKeyPrefixForTest());
    assert.hasAllKeys(runtime.arcById, ['test-arc', 'other-test-arc']);
  });
  it('registers and unregisters stores', Flags.withDefaultReferenceMode(async () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const context = await Manifest.parse(``, {memoryProvider});
    const loader = new Loader(null, {
      manifest: `
        schema Thing
        particle MyParticle in './my-particle.js'
          t1: writes Thing
          t2: writes Thing
          t3: writes [Thing]
        recipe
          t1: create
          t2: create *
          t3: create tied-to-runtime #things
          MyParticle
            t1: writes t1
            t2: writes t2
            t3: writes t3
        particle MyOtherParticle in './my-other-particle.js'
          t4: reads [Thing]
        recipe
          t4: map #things
          MyOtherParticle
            t4: reads t4
      `,
      '*': 'defineParticle(({Particle}) => class extends Particle {});',
    });
    const runtime = new Runtime({loader, context, memoryProvider});
    const manifest = await Manifest.load('manifest', loader, {memoryProvider});
    manifest.recipes[0].normalize();
    const volatileArc = runtime.runArc('test-arc-1', volatileStorageKeyPrefixForTest());
    const ramdiskArc = runtime.runArc('test-arc-2', ramDiskStorageKeyPrefixForTest());
    assert.equal(runtime.context, ramdiskArc.context);
    assert.equal(runtime.context, volatileArc.context);

    await volatileArc.instantiate(manifest.recipes[0]);
    assert.lengthOf(runtime.context.stores, 1);

    await ramdiskArc.instantiate(manifest.recipes[0]);
    assert.lengthOf(runtime.context.stores, 2);

    const volatileArc1 = runtime.runArc('test-arc-v1', volatileStorageKeyPrefixForTest());
    const recipe1 = await runtime.resolveRecipe(volatileArc1, manifest.recipes[1]);
    assert.isTrue(recipe1 && recipe1.isResolved());
    await volatileArc1.instantiate(recipe1);
    assert.lengthOf(runtime.context.stores, 2);
    volatileArc1.dispose();
    assert.lengthOf(runtime.context.stores, 2);

    volatileArc.dispose();
    assert.lengthOf(runtime.context.stores, 2);

    ramdiskArc.dispose();
    assert.lengthOf(runtime.context.stores, 2);

    const volatileArc2 = runtime.runArc('test-arc-v2', volatileStorageKeyPrefixForTest());
    const recipe2 = await runtime.resolveRecipe(volatileArc2, manifest.recipes[1]);
    assert.isTrue(recipe2 && recipe2.isResolved());
    await volatileArc2.instantiate(recipe2);
    assert.lengthOf(runtime.context.stores, 2);
    assert.isTrue(runtime.context.stores.map(s => s.storageKey).includes(
        volatileArc2.activeRecipe.handles[0].storageKey));
  }));
});
