/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlanGenerator} from '../plan-generator.js';
import {assert} from '../../platform/chai-node.js';
import {Manifest} from '../../runtime/manifest.js';

describe('recipe2plan', () => {
  describe('plan-generator', () => {
    let emptyGenerator;
    beforeEach(() => {
      emptyGenerator = new PlanGenerator([], '');
    });
    it('imports arcs.core.data when the package is different', () => {
      const generator = new PlanGenerator([], 'some.package');

      const actual = generator.fileHeader();

      assert.include(actual, 'import arcs.core.data.*');
    });
    it('does not import arcs.core.data when the package is the same', () => {
      const generator = new PlanGenerator([], 'arcs.core.data');

      const actual = generator.fileHeader();

      assert.notInclude(actual, 'import arcs.core.data.*');
    });
    it('creates valid types that refer to registered Schemas', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
     
     recipe R
       h: create persistent 'some-id'
       A
         data: writes h`);

      await emptyGenerator.collectParticleConnectionSpecs(manifest.recipes[0].particles[0]);
      const actual = await emptyGenerator.createType(manifest.particles[0].handleConnections[0].type);

      assert.include(actual, 'EntityType(A_Data_Spec.schema)');
      assert.notInclude(actual, 'SingletonType');
    });
    it('creates valid types that are derived from other types (via nesting)', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes [Thing {num: Number}]
       
     recipe R
       h: create persistent 'some-id'
       A
         data: writes h`);

      await emptyGenerator.collectParticleConnectionSpecs(manifest.recipes[0].particles[0]);
      const actual = await emptyGenerator.createType(manifest.particles[0].handleConnections[0].type);

      assert.include(actual, 'EntityType(A_Data_Spec.schema)');
      assert.notInclude(actual, 'SingletonType');
      assert.include(actual, 'CollectionType');
    });
    it('creates valid types that are derived from a few other types (via lots of nesting)', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes [&Thing {num: Number}]
       
     recipe R
       h: create persistent 'some-id'
       A
         data: writes h`);

      await emptyGenerator.collectParticleConnectionSpecs(manifest.recipes[0].particles[0]);
      const actual = await emptyGenerator.createType(manifest.particles[0].handleConnections[0].type);

      assert.include(actual, 'EntityType(A_Data_Spec.schema)');
      assert.notInclude(actual, 'SingletonType');
      assert.include(actual, 'CollectionType');
      assert.include(actual, 'ReferenceType');
    });
  });
});
