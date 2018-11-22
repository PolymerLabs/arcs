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

import {Manifest} from '../../ts-build/manifest.js';
import {Planner} from '../../ts-build/planner.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {MatchParticleByVerb} from '../../strategies/match-particle-by-verb.js';
import {assert} from '../chai-web.js';

describe('MatchParticleByVerb', function() {
  const manifestStr = `
    schema Energy
    schema Height
    particle SimpleJumper &jump in 'A.js'
      in Energy e
      out Height h
      modality dom
      consume root
    particle StarJumper &jump in 'AA.js'
      in Energy e
      inout Height h
      modality dom
      consume root
    particle VoiceStarJumper &jump in 'AA.js'  // wrong modality
      in Energy e
      out Height h
      modality voice
      consume root
    particle GalaxyJumper &jump in 'AA.js'  // wrong connections
      in Energy e
      modality dom
      consume root
    particle StarFlyer &fly in 'AA.js'  // wrong verb

    recipe
      use as height
      use as energy
      &jump
        * = height
        * <- energy
  `;

  it('particles by verb strategy', async () => {
    const manifest = (await Manifest.parse(manifestStr));
    const arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    // Apply MatchParticleByVerb strategy.
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const mpv = new MatchParticleByVerb(arc);
    const results = await mpv.generate(inputParams);
    assert.lengthOf(results, 3);
    // Note: handle connections are not resolved yet.
    assert.deepEqual(['GalaxyJumper', 'SimpleJumper', 'StarJumper'], results.map(r => r.result.particles[0].name).sort());
  });

  it('particles by verb recipe fully resolved', async () => {
    const manifest = (await Manifest.parse(manifestStr));
    const recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage({id: 'test1', type: manifest.findSchemaByName('Height').entityClass().type});
    recipe.handles[1].mapToStorage({id: 'test2', type: manifest.findSchemaByName('Energy').entityClass().type});

    const arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    // Apply all strategies to resolve recipe where particles are referenced by verbs.
    const planner = new Planner();
    planner.init(arc);
    const plans = await planner.plan(1000);

    assert.lengthOf(plans, 2);
    assert.deepEqual([['SimpleJumper'], ['StarJumper']],
                     plans.map(plan => plan.particles.map(particle => particle.name)));
  });
});
