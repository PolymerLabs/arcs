/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ManifestCodegenUnitTest} from './codegen-unit-test-base.js';
import {CodegenUnitTest} from './codegen-unit-test-base.js';
import {Manifest} from '../../runtime/manifest.js';
import {AllocatorRecipeResolver} from '../allocator-recipe-resolver.js';
import {PlanGenerator} from '../plan-generator.js';

export const recipe2PlanTestSuite: CodegenUnitTest[] = [
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Plan Generation - Plans',
        'plan-generator-plans.cgtest'
      );
    }
    async computeFromManifest(manifest: Manifest) {
      const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
      const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
      const plan = generator.generate();
      return plan;
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Plan Generation - Particles',
        'plan-generator-particles.cgtest'
      );
    }
    async computeFromManifest(manifest: Manifest) {
      const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
      const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
      const particles = recipes.map(recipe => recipe.particles).reduce((a, b) => a.concat(b));
      return Promise.all(particles.map(particle => generator.createParticle(particle)));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Plan Generation - Particles',
        'plan-generator-handleConnections.cgtest'
      );
    }
    async computeFromManifest(manifest: Manifest) {
      const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
      const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
      const particles = recipes.map(recipe => recipe.particles).reduce((a, b) => a.concat(b));
      const handleConnections = particles.map(particles => Object.values(particles.connections)).reduce((a, b) => a.concat(b));
      return Promise.all(handleConnections.map(hc => generator.createHandleConnection(hc)));
    }
  }(),
  new class extends ManifestCodegenUnitTest {
    constructor() {
      super(
        'Kotlin Plan Generation - Particles',
        'plan-generator-handles.cgtest'
      );
    }
    async computeFromManifest(manifest: Manifest) {
      const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
      const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace');
      const handles = recipes.map(recipe => recipe.handles).reduce((a, b) => a.concat(b));
      return Promise.all(handles.map(handle => generator.createHandleVariable(handle)));
    }
  }()
];
