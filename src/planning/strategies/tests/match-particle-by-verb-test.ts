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
import {Manifest} from '../../../runtime/manifest.js';
import {Modality} from '../../../runtime/modality.js';
import {Planner} from '../../planner.js';
import {MatchParticleByVerb} from '../../strategies/match-particle-by-verb.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

import {Entity} from '../../../runtime/entity.js';

describe('MatchParticleByVerb', () => {
  const manifestStr = `
    schema Energy
    schema Height
    particle SimpleJumper &jump in 'A.js'
      e: reads Energy
      h: writes Height
      modality dom
      root: consumes Slot
    particle StarJumper &jump in 'AA.js'
      e: reads Energy
      h: reads writes Height
      modality dom
      root: consumes Slot
    particle VoiceStarJumper &jump in 'AA.js'  // wrong modality
      e: reads Energy
      h: writes Height
      modality voice
      root: consumes Slot
    particle GalaxyJumper &jump in 'AA.js'  // wrong connections
      e: reads Energy
      modality dom
      root: consumes Slot
    particle StarFlyer &fly in 'AA.js'  // wrong verb

    recipe
      height: use *
      energy: use *
      &jump
        height
        reads energy
  `;

  it('particles by verb strategy', async () => {
    const manifest = (await Manifest.parse(manifestStr));
    const arc = StrategyTestHelper.createTestArc(manifest, {modality: Modality.dom});
    // Apply MatchParticleByVerb strategy.
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const mpv = new MatchParticleByVerb(arc, StrategyTestHelper.createTestStrategyArgs(arc));

    const results = await mpv.generate(inputParams);
    assert.lengthOf(results, 3);
    // Note: handle connections are not resolved yet.
    assert.deepEqual(['GalaxyJumper', 'SimpleJumper', 'StarJumper'],
        results.map(r => r.result.particles[0].name).sort());
  });

  it('particles by verb recipe fully resolved', async () => {
    const manifest = (await Manifest.parse(manifestStr));
    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage({id: 'test1', type: Entity.createEntityClass(manifest.findSchemaByName('Height'), null).type});
    recipe.handles[1].mapToStorage({id: 'test2', type: Entity.createEntityClass(manifest.findSchemaByName('Energy'), null).type});

    const arc = StrategyTestHelper.createTestArc(manifest, {modality: Modality.dom});

    // Apply all strategies to resolve recipe where particles are referenced by verbs.
    const planner = new Planner();
    planner.init(arc, {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc)});
    const plans = await planner.plan(1000);

    assert.lengthOf(plans, 2);
    assert.deepEqual(plans.map(plan => plan.particles.map(particle => particle.name)),
        [['SimpleJumper'], ['StarJumper']]);
  });
});
