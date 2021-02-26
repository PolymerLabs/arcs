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
import {RamDiskStorageDriverProvider} from '../storage/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {ramDiskStorageKeyPrefixForTest, volatileStorageKeyPrefixForTest} from '../testing/handle-for-test.js';
import {Flags} from '../flags.js';

// tslint:disable-next-line: no-any
function unsafe<T>(value: T): any { return value; }

function assertManifestsEqual(actual: Manifest, expected: Manifest) {
  // Delete the IdGenerator before comparing that the manifests are the same, since the IdGenerator will contain a different random session ID
  // for each Manifest instantiation.
  unsafe(expected).idGenerator = null;
  unsafe(expected).generateID = null;
  unsafe(actual).idGenerator = null;
  unsafe(actual).generateID = null;
  for (const canonicalManfiest of unsafe(expected).canonicalImports) {
    canonicalManfiest.idGenerator = null;
    canonicalManfiest.generateID = null;
  }
  for (const canonicalManfiest of unsafe(actual).canonicalImports) {
    canonicalManfiest.idGenerator = null;
    canonicalManfiest.generateID = null;
  }

  assert.deepEqual(expected, actual);
}

describe('Runtime', () => {
  it('gets an arc description for an arc', async () => {
    const runtime = new Runtime();
    const {storageService, driverFactory, storageKeyParser} = runtime;
    const arc = new Arc({
      slotComposer: new SlotComposer(),
      id: ArcId.newForTest('test'),
      loader: new Loader(),
      context: new Manifest({id: ArcId.newForTest('test')}),
      storageService,
      driverFactory,
      storageKeyParser
    });
    const description = await Description.create(arc);
    const expected = await description.getArcDescription();
    const actual = await runtime.getArcDescription(arc);
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
    const fileName = './src/runtime/tests/artifacts/test.manifest';
    const expected = await Manifest.parse(content, {fileName});
    const actual = await new Runtime().parse(content, {fileName});
    assertManifestsEqual(actual, expected);
  });
  it('loads a Manifest', async () => {
    const registry = {};
    const loader = new Loader();
    const path = './src/runtime/tests/artifacts/test.manifest';
    const expected = await Manifest.load(path, loader, {registry});
    const runtime = new Runtime({loader});
    const actual = await runtime.parseFile(path, {loader, registry});
    assertManifestsEqual(actual, expected);
  });
  it('runs arcs', async () => {
    const runtime = new Runtime();
    assert.equal(runtime.arcById.size, 0);
    const arc = runtime.newArc({arcName: 'test-arc', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    assert.isNotNull(arc);
    assert(arc.id.toString().includes('test-arc'));
    assert.hasAllKeys(runtime.arcById, [arc.id]);
    runtime.newArc({storageKeyPrefix: volatileStorageKeyPrefixForTest(), arcId: arc.id});
    assert.hasAllKeys(runtime.arcById, [arc.id]);
    const otherArc = runtime.newArc({arcName: 'other-arc', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    assert.hasAllKeys(runtime.arcById, [arc.id, otherArc.id]);
  });
  it('registers and unregisters stores', Flags.withDefaultReferenceMode(async () => {
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
          t3: create #things @tiedToRuntime
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
    const runtime = new Runtime({loader});
    const manifest = await runtime.parseFile('manifest');
    manifest.recipes[0].normalize();
    const volatileArc = runtime.newArc({arcName: 'test-arc-1', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    const ramdiskArc = runtime.newArc({arcName: 'test-arc-2', storageKeyPrefix: ramDiskStorageKeyPrefixForTest()});
    assert.equal(runtime.context, ramdiskArc.context);
    assert.equal(runtime.context, volatileArc.context);

    await runtime.allocator.runPlanInArc(volatileArc.id, manifest.recipes[0]);
    assert.lengthOf(runtime.context.stores, 3);

    await runtime.allocator.runPlanInArc(ramdiskArc.id, manifest.recipes[0]);
    assert.lengthOf(runtime.context.stores, 6);

    const volatileArc1 = runtime.newArc({arcName: 'test-arc-v1', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    const recipe1 = await runtime.resolveRecipe(volatileArc1, manifest.recipes[1]);
    assert.isTrue(recipe1 && recipe1.isResolved());
    await runtime.allocator.runPlanInArc(volatileArc1.id, recipe1);
    assert.lengthOf(runtime.context.stores, 6);
    volatileArc1.dispose();
    assert.lengthOf(runtime.context.stores, 6);

    volatileArc.dispose();
    assert.lengthOf(runtime.context.stores, 6);

    ramdiskArc.dispose();
    assert.lengthOf(runtime.context.stores, 6);

    const volatileArc2 = runtime.newArc({arcName: 'test-arc-v2', storageKeyPrefix: volatileStorageKeyPrefixForTest()});
    const recipe2 = await runtime.resolveRecipe(volatileArc2, manifest.recipes[1]);
    assert.isTrue(recipe2 && recipe2.isResolved());
    await runtime.allocator.runPlanInArc(volatileArc2.id, recipe2);
    assert.lengthOf(runtime.context.stores, 6);
    assert.isTrue(runtime.context.stores.map(s => s.storageKey).includes(
        volatileArc2.activeRecipe.handles[0].storageKey));
  }));
});
