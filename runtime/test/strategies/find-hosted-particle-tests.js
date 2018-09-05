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

import {Manifest} from '../../manifest.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {Loader} from '../../loader.js';
import {Arc} from '../../arc.js';
import {FindHostedParticle} from '../../strategies/find-hosted-particle.js';
import {handleFor} from '../../handle.js';
import {assert} from '../chai-web.js';

async function runStrategy(manifestStr) {
  let manifest = await Manifest.parse(manifestStr);
  let recipes = manifest.recipes;
  recipes.forEach(recipe => recipe.normalize());
  let arc = StrategyTestHelper.createTestArc('test-arc', manifest, 'dom');
  let inputParams = {generated: recipes.map(recipe => ({result: recipe, score: 1}))};
  let strategy = new FindHostedParticle(arc);
  return (await strategy.generate(inputParams)).map(r => r.result);
}

describe('FindHostedParticle', function() {
  it(`can host a matching particle from the context`, async () => {
    let results = await runStrategy(`
      schema Thing
      schema OtherThing

      particle Matches
        in Thing thingy

      particle DoesNotMatch
        out Thing thingy

      particle AlsoDoesNotMatch
        in OtherThing thingy

      shape HostedShape
        in Thing *

      particle Host
        host HostedShape hosted

      recipe
        Host
    `);

    assert.lengthOf(results, 1);
    let recipe = results[0];
    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.handles, 1);
    let handle = recipe.handles[0];
    assert.equal(handle.fate, 'copy');
    assert.isTrue(handle.id.toString().endsWith(':test-arc:particle-literal:Matches'));
    assert.isTrue(handle.type.isInterface);
    assert.isTrue(handle.type.isResolved());
    assert.equal(handle.type.interfaceShape.name, 'HostedShape');
  });
  it(`reuses the handle holding particle spec`, async () => {
    let results = await runStrategy(`
      schema Thing
      schema OtherThing

      particle Matches
        in Thing thingy

      shape HostedShape
        in Thing *

      particle Host
        host HostedShape hosted1
        host HostedShape hosted2

      recipe
        Host
    `);

    assert.lengthOf(results, 1);
    let recipe = results[0];
    assert.isTrue(recipe.isResolved());

    assert.lengthOf(recipe.handles, 1);
    let handle = recipe.handles[0];
    assert.equal(handle.fate, 'copy');
    assert.isTrue(handle.id.toString().endsWith(':test-arc:particle-literal:Matches'));
    assert.isTrue(handle.type.isInterface);
    assert.equal(handle.type.interfaceShape.name, 'HostedShape');

    const connections = Object.values(recipe.particles[0].connections);
    assert.lengthOf(connections, 2);
    assert.isTrue(connections.every(hc => hc.handle === handle));
  });
  it(`respects type system constraints`, async () => {
    let results = await runStrategy(`
      schema Thing
      schema Instrument extends Thing
      schema Guitar extends Instrument
      schema Gibson extends Guitar
      schema LesPaul extends Gibson

      particle Lower
        in Instrument input

      particle Upper
        out Gibson output

      shape HostedShape
        inout ~a *
        consume foo
      particle Host
        host HostedShape hosted
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
    let particleMatches = results.map(recipe => {
      let particleSpecHandle = recipe.handles.find(h => h.fate === 'copy');
      return particleSpecHandle.id.match(/:particle-literal:([a-zA-Z]+)$/)[1];
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

      shape HostedShape
        in ~a *

      particle Host
        host HostedShape hosted

      recipe
        Host
    `));
  });
  it(`produces recipes that can be instantiated with particle spec`, async () => {
    let loader = new Loader();
    let manifest = await Manifest.parse(`
      import 'runtime/test/artifacts/test-particles.manifest'

      recipe
        create as h0
        create as h1
        OuterParticle
          input = h1
          output = h0
    `, {loader, fileName: process.cwd() + '/input.manifest'});

    let arc = new Arc({id: 'test', context: manifest, loader});
    let strategy = new FindHostedParticle(arc);

    let inRecipe = manifest.recipes[0];
    inRecipe.normalize();

    let results = await strategy.generate({generated: [{result: inRecipe}]});
    assert.lengthOf(results, 1);
    let outRecipe = results[0].result;

    let particleSpecHandle = outRecipe.handles.find(h => h.fate === 'copy');
    assert(particleSpecHandle.id.endsWith(':test:particle-literal:TestParticle'));
    assert(outRecipe.isResolved());

    assert.isEmpty(arc._stores);
    await arc.instantiate(outRecipe);
    let particleSpecStore = arc._stores.find(store => store.type.isInterface);
    const particleSpec = await particleSpecStore.get();
    assert.isNotNull(particleSpec.id, 'particleSpec stored in handle should have an id');
    delete particleSpec.id;
    assert.deepEqual(manifest.findParticleByName('TestParticle').toLiteral(), particleSpec);
  });
});
