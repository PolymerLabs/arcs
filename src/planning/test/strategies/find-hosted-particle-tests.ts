/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../../../platform/chai-web.js';
import {Arc} from '../../../runtime/arc.js';
import {Loader} from '../../../runtime/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {VariableStorageProvider} from '../../../runtime/storage/storage-provider-base';
import {InterfaceType} from '../../../runtime/type.js';
import {FindHostedParticle} from '../../strategies/find-hosted-particle.js';

import {StrategyTestHelper} from './strategy-test-helper.js';
import {Id} from '../../../runtime/id.js';

async function runStrategy(manifestStr) {
  const manifest = await Manifest.parse(manifestStr);
  const recipes = manifest.recipes;
  recipes.forEach(recipe => recipe.normalize());
  const inputParams = {generated: recipes.map(recipe => ({result: recipe, score: 1}))};
  const strategy = new FindHostedParticle(StrategyTestHelper.createTestArc(manifest));
  return (await strategy.generate(inputParams)).map(r => r.result);
}

describe('FindHostedParticle', () => {
  it(`can host a matching particle from the context`, async () => {
    const results = await runStrategy(`
      schema Thing
      schema OtherThing

      particle Matches
        in Thing thingy

      particle DoesNotMatch
        out Thing thingy

      particle AlsoDoesNotMatch
        in OtherThing thingy

      interface HostedInterface
        in Thing *

      particle Host
        host HostedInterface hosted

      recipe
        Host
    `);

    assert.lengthOf(results, 1);
    const recipe = results[0];
    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.handles, 1);
    const handle = recipe.handles[0];
    assert.equal(handle.fate, 'copy');
    assert.isDefined(handle.id);
    assert.isTrue(handle.type instanceof InterfaceType);
    assert.isTrue(handle.type.isResolved());
    assert.equal(handle.type.interfaceInfo.name, 'HostedInterface');
  });
  it(`respects type system constraints`, async () => {
    const results = await runStrategy(`
      schema Thing
      schema Instrument extends Thing
      schema Guitar extends Instrument
      schema Gibson extends Guitar
      schema LesPaul extends Gibson

      particle Lower
        in Instrument input

      particle Upper
        out Gibson output

      interface HostedInterface
        inout ~a *
        consume foo
      particle Host
        host HostedInterface hosted
        inout ~a item

      recipe
        create as item
        Lower
          input = item
        Upper
          output = item
        Host
          item = item

      particle ThingCandidate
        inout Thing thingy
        consume foo
      particle InstrumentCandidate
        inout Instrument instrument
        consume foo
      particle GuitarCandidate
        inout Guitar guitar
        consume foo
      particle GibsonCandidate
        inout Gibson gibson
        consume foo
      particle LesPaulCandidate
        inout LesPaul lp
        consume foo
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
        in ~a thingy

      interface HostedInterface
        in ~a *

      particle Host
        host HostedInterface hosted

      recipe
        Host
    `));
  });
  it(`produces recipes that can be instantiated with particle spec`, async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import 'src/runtime/test/artifacts/test-particles.manifest'

      recipe
        create as h0
        create as h1
        OuterParticle
          input = h1
          output = h0
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    const arc = new Arc({id: new Id('test'), context: manifest, loader});
    const strategy = new FindHostedParticle(arc);

    const inRecipe = manifest.recipes[0];
    inRecipe.normalize();

    const results = await strategy.generate({generated: [{result: inRecipe}]});
    assert.lengthOf(results, 1);
    const outRecipe = results[0].result;

    const particleSpecHandle = outRecipe.handles.find(h => h.fate === 'copy');
    assert.equal('TestParticle', particleSpecHandle.immediateValue.name);
    assert(outRecipe.isResolved());

    assert.isEmpty(arc._stores);
    await arc.instantiate(outRecipe);
    const particleSpecStore = arc._stores.find(store => store.type instanceof InterfaceType) as VariableStorageProvider;
    const particleSpec = await particleSpecStore.get();
    assert.isNotNull(particleSpec.id, 'particleSpec stored in handle should have an id');
    delete particleSpec.id;
    assert.deepEqual(manifest.findParticleByName('TestParticle').toLiteral(), particleSpec);
  });
});
