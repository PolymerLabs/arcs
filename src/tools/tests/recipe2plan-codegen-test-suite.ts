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
        'Kotlin Plan Generation',
        'plan-generator.cgtest'
      );
    }
    async computeFromManifest(manifest: Manifest) {
      const recipes = await new AllocatorRecipeResolver(manifest, 'random_salt').resolve();
      const generator = new PlanGenerator(recipes, manifest.meta.namespace || 'test.namespace', null);
      return generator.generate();
    }
  }()
];
