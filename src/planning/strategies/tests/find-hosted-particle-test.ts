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
import {Arc} from '../../../runtime/arc.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {SingletonStorageProvider} from '../../../runtime/storage/storage-provider-base.js';
import {InterfaceType} from '../../../runtime/type.js';
import {FindHostedParticle} from '../../strategies/find-hosted-particle.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {ArcId} from '../../../runtime/id.js';
import {singletonHandleForTest} from '../../../runtime/testing/handle-for-test.js';
import {Flags} from '../../../runtime/flags.js';

async function runStrategy(manifestStr) {
  const manifest = await Manifest.parse(manifestStr);
  const recipes = manifest.recipes;
  recipes.forEach(recipe => recipe.normalize());
  const generated = recipes.map(recipe => ({result: recipe, score: 1}));
  const strategy = new FindHostedParticle(StrategyTestHelper.createTestArc(manifest));
  return (await strategy.generateFrom(generated)).map(r => r.result);
}

describe('FindHostedParticle', () => {
  it(`can host a matching particle from the context`, async () => {
    const results = await runStrategy(`
      schema Thing
      schema OtherThing

      particle Matches
        thingy: reads Thing

      particle DoesNotMatch
        thingy: writes Thing

      particle AlsoDoesNotMatch
        thingy: reads OtherThing

      interface HostedInterface
        reads Thing

      particle Host
        hosted: hosts HostedInterface

      recipe
        Host
    `);

    assert.lengthOf(results, 1);
    const recipe = results[0];
    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.handles, 1);
    const handle = recipe.handles[0];
    assert.strictEqual(handle.fate, 'copy');
    assert.isDefined(handle.id);
    assert.isTrue(handle.type instanceof InterfaceType);
    assert.isTrue(handle.type.isResolved());
    assert.strictEqual((handle.type as InterfaceType).interfaceInfo.name, 'HostedInterface');
  });
  it(`respects type system constraints`, async () => {
    const results = await runStrategy(`
      schema Thing
      schema Instrument extends Thing
      schema Guitar extends Instrument
      schema Gibson extends Guitar
      schema LesPaul extends Gibson

      particle Lower
        input: reads Instrument

      particle Upper
        output: writes Gibson

      interface HostedInterface
        reads writes ~a
        foo: consumes Slot
      particle Host
        hosted: hosts HostedInterface
        item: reads writes ~a

      recipe
        item: create *
        Lower
          input: item
        Upper
          output: item
        Host
          item: item

      particle ThingCandidate
        thingy: reads writes Thing
        foo: consumes Slot
      particle InstrumentCandidate
        instrument: reads writes Instrument
        foo: consumes Slot
      particle GuitarCandidate
        guitar: reads writes Guitar
        foo: consumes Slot
      particle GibsonCandidate
        gibson: reads writes Gibson
        foo: consumes Slot
      particle LesPaulCandidate
        lp: reads writes LesPaul
        foo: consumes Slot
    `);

    // inout Thing is not be compatible with in Instrument input
    // inout LesPaul is not be compatible with out Gibson output
    // Remaining 3 candidates are compatible with Lower and Upper particles.

    assert.lengthOf(results, 3);
    const particleMatches = results.map(recipe => {
      return recipe.handles.find(h => h.fate === 'copy').immediateValue.name;
    });
    particleMatches.sort();
    assert.deepEqual(particleMatches, [
      'GibsonCandidate',
      'GuitarCandidate',
      'InstrumentCandidate'
    ]);
  });
  it(`doesn't host a particle if types cannot be determined`, async () => {
    // TODO: This could work, but we currently don't allow it because handle
    //       holding particle spec should have a concrete type. How to fix this?
    assert.isEmpty(await runStrategy(`
      particle Matches
        thingy: reads ~a

      interface HostedInterface
        reads ~a

      particle Host
        hosted: hosts HostedInterface

      recipe
        Host
    `));
  });
  it(`produces recipes that can be instantiated with particle spec`, async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import 'src/runtime/tests/artifacts/test-particles.manifest'

      recipe
        h0: create *
        h1: create *
        OuterParticle
          input: h1
          output: h0
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const strategy = new FindHostedParticle(arc);

    const inRecipe = manifest.recipes[0];
    inRecipe.normalize();

    const results = await strategy.generateFrom([{result: inRecipe, score: 0}]);
    assert.lengthOf(results, 1);
    const outRecipe = results[0].result;

    const particleSpecHandle = outRecipe.handles.find(h => h.fate === 'copy');
    assert.strictEqual('TestParticle', particleSpecHandle.immediateValue.name);
    assert(outRecipe.isResolved());

    assert.isEmpty(arc._stores);
    await arc.instantiate(outRecipe);
    // TODO(shans): This is not really the right way to look for stores on an arc...
    const particleSpecStore = arc._stores.find(store => store.type instanceof InterfaceType || store.type.getContainedType() instanceof InterfaceType);
    let particleSpec;
    if (Flags.useNewStorageStack) {
      const handle = await singletonHandleForTest(arc, particleSpecStore);
      particleSpec = await handle.fetch();
    } else {
      particleSpec = await (particleSpecStore as SingletonStorageProvider).fetch();
    }
    assert.isNotNull(particleSpec.id, 'particleSpec stored in handle should have an id');
    delete particleSpec.id;
    await arc.idle;
    if (Flags.useNewStorageStack) {
      assert.deepEqual(manifest.findParticleByName('TestParticle').toLiteral(), particleSpec.toLiteral());
    } else {
      assert.deepEqual(manifest.findParticleByName('TestParticle').toLiteral(), particleSpec);
    }
  });
});
