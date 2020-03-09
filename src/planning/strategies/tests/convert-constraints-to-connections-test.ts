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
import {Modality} from '../../../runtime/modality.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {ConvertConstraintsToConnections} from '../../strategies/convert-constraints-to-connections.js';
import {InstanceEndPoint} from '../../../runtime/recipe/connection-constraint.js';
import {ArcId} from '../../../runtime/id.js';

describe('ConvertConstraintsToConnections', () => {
  const newArc = (manifest: Manifest) => {
    return new Arc({
      id: ArcId.newForTest('test-plan-arc'),
      slotComposer: new SlotComposer(),
      context: manifest,
      loader: new Loader()
    });
  };

  it('fills out an empty constraint', async () => {
    const manifest = await Manifest.parse(`
      particle A
        b: reads writes S {}
      particle C
        d: reads writes S {}

      recipe
        A.b: writes C.d`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: create // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('does not cause an input only handle to be created', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads S
      particle C
        d: reads S

      recipe
        A.b: writes C.d`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.isEmpty(results);
  });

  it('can resolve input only handle connection with a mapped handle', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads S
      particle C
        d: reads S

      recipe
        handle0: map
        A.b: C.d`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
  });

  it('can create handle for input and output handle', async () => {
    const parseManifest = async (constraint1, constraint2) => await Manifest.parse(`
      schema S
      particle A
        b: reads S
      particle C
        d: reads S
      particle E
        f: writes S

      recipe
        ${constraint1}
        ${constraint2}`);
    const verify = async (constraint1, constraint2) => {
      const manifest = await parseManifest(constraint1, constraint2);
      const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
      const cctc = new ConvertConstraintsToConnections(newArc(manifest));
      const results = await cctc.generateFrom(generated);
      assert.lengthOf(results, 1, `Failed to resolve ${constraint1} & ${constraint2}`);
    };
    // Test for all possible combination of connection constraints with 3 particles.
    const constraints = [['A.b: C.d', 'C.d: A.b'], ['A.b: writes E.f', 'E.f: reads A.b'], ['C.d: writes E.f', 'E.f: reads C.d']];
    for (let i = 0; i < constraints.length; ++i) {
      for (let j = 0; j < constraints.length; ++j) {
        if (i === j) continue;
        for (let ii = 0; ii <= 1; ++ii) {
          for (let jj = 0; jj <= 1; ++jj) {
            await verify(constraints[i][ii], constraints[j][jj]);
          }
        }
      }
    }
  });

  it('fills out a constraint, reusing a single particle', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        C`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: create // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('fills out a constraint, reusing a single particle (2)', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        A`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: create // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('fills out a constraint, reusing two particles', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        C
        A`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: create // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('fills out a constraint, reusing two particles and a handle', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        handle1: use
        C
          d: reads writes handle1
        A`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: use // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('fills out a constraint, reusing two particles and a handle (2)', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        handle1: use
        C
        A
          b: handle1`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  handle0: use // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('removes an already fulfilled constraint', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A
        b: reads writes S
      particle C
        d: reads writes S

      recipe
        A.b: writes C.d
        handle1: use
        C
          d: reads writes handle1
        A
          b: reads writes handle1`);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const {result, score} = results[0];
    assert.deepEqual(result.toString(), `recipe
  handle0: use // S {}
  A as particle0
    b: reads writes handle0
  C as particle1
    d: reads writes handle0`);
  });

  it('verifies modality', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle A in 'A.js'
        b: writes S
        modality vr
        root: consumes
      particle C in 'C.js'
        d: reads S
        modality vr
        root: consumes
      particle E in 'E.js'
        f: reads S
        root: consumes

      recipe
        A.b: writes C.d
      recipe
        A.b: writes E.f
    `);

    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}, {result: manifest.recipes[1], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(new Arc({
      id: ArcId.newForTest('test-plan-arc'),
      context: manifest,
      loader: new Loader(),
      modality: Modality.vr
    }));

    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.particles.map(p => p.name), ['A', 'C']);
  });

  it('connects to handles', async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
      particle B
        i: reads S {}
      recipe
        h: ?
        A.o: writes h
        h: writes B.i
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? // S {}
  A as particle0
    o: writes handle0
  B as particle1
    i: reads handle0`);
  });

  it('connects existing particles to handles', async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
      particle B
        i: reads S {}
      recipe
        h: ?
        A.o: writes h
        h: writes B.i
        A
        B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? // S {}
  A as particle0
    o: writes handle0
  B as particle1
    i: reads handle0`);
  });

  it(`doesn't attempt to duplicate existing handles to particles`, async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
      particle B
        i: reads S {}
      recipe
        h: ?
        A.o: writes h
        h: writes B.i
        A
          o: writes h
        B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? // S {}
  A as particle0
    o: writes handle0
  B as particle1
    i: reads handle0`);
  });

  it(`duplicates particles to get handle connections right`, async () => {
    const manifest = await Manifest.parse(`
      particle A
        o: writes S {}
      particle B
        i: reads S {}
      recipe
        h: ?
        j: ?
        A.o: writes h
        h: writes B.i
        A
          o: writes j
        B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? // ~
  handle1: ? // S {}
  A as particle0
    o: writes handle0
  A as particle1
    o: writes handle1
  B as particle2
    i: reads handle1`);
  });

  it('connects to tags', async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
    particle B
      i: writes S {}
    recipe
      ? #hashtag
      A.o: writes #hashtag
      #trashbag: reads B.i
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? #hashtag // ~
  handle1: create #trashbag // ~
  A as particle0
    o: writes handle0
  B as particle1
    i: writes handle1`);
  });

  it('connects existing particles to tags', async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
    particle B
      i: writes S {}
    recipe
      ? #hashtag
      A.o: writes #hashtag
      #trashbag: reads B.i
      A
      B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? #hashtag // ~
  handle1: create #trashbag // ~
  A as particle0
    o: writes handle0
  B as particle1
    i: writes handle1`);
  });

  it(`doesn't attempt to duplicate existing connections to tags`, async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
    particle B
      i: writes S {}
    recipe
      handle0: ? #hashtag
      A.o: writes #hashtag
      #trashbag: reads B.i
      A
        o: writes handle0
      B
        i: writes handle0
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(), `recipe
  handle0: ? #hashtag // ~
  A as particle0
    o: writes handle0
  B as particle1
    i: writes handle0`);
  });

  it(`connects particles together when there's only one possible connection`, async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
    particle B
      i: reads S {}
    recipe
      A: writes B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.strictEqual((recipe.obligations[0].from as InstanceEndPoint).instance, recipe.particles[0]);
    assert.strictEqual((recipe.obligations[0].to as InstanceEndPoint).instance, recipe.particles[1]);
  });

  it(`connects particles together when there's extra things that can't connect`, async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
      i: reads S {}
    particle B
      i: reads S {}
      i2: reads T {}
    recipe
      A: writes B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.strictEqual((recipe.obligations[0].from as InstanceEndPoint).instance, recipe.particles[0]);
    assert.strictEqual((recipe.obligations[0].to as InstanceEndPoint).instance, recipe.particles[1]);
  });

  it(`connects particles together with multiple connections`, async () => {
    const manifest = await Manifest.parse(`
    particle A
      o: writes S {}
      i: reads T {}
    particle B
      i: reads S {}
      o: writes T {}
    recipe
      A: reads writes B
    `);
    const generated = [{result: manifest.recipes[0], score: 1, derivation: [], hash: '0', valid: true}];
    const cctc = new ConvertConstraintsToConnections(newArc(manifest));
    const results = await cctc.generateFrom(generated);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.deepEqual(recipe.particles.map(p => p.name), ['A', 'B']);
    assert.lengthOf(recipe.obligations, 1);
    assert.strictEqual((recipe.obligations[0].from as InstanceEndPoint).instance, recipe.particles[0]);
    assert.strictEqual((recipe.obligations[0].to as InstanceEndPoint).instance, recipe.particles[1]);
  });
});
