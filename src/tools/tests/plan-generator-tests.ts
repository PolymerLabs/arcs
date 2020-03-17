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
import {Ttl, TtlUnits} from '../../runtime/recipe/ttl.js';
import {StorageKeyRecipeResolver} from '../storage-key-recipe-resolver.js';

describe('recipe2plan', () => {
  describe('plan-generator', () => {
    const collectOccurrences = (corpus: string, targetPrefix: string, targetSuffix: string): string[] => {
      let idx = 0;
      const collection: string[] = [];
      while (idx !== -1) {
        const start = corpus.indexOf(targetPrefix, idx);
        const end = corpus.indexOf(targetSuffix, start);
        if (start === -1 || end === -1) break;
        idx = end;
        const target = corpus.substring(start + targetPrefix.length, end);
        collection.push(target);
      }
      return collection;
    };
    let emptyGenerator: PlanGenerator;
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

      assert.include(actual, 'EntityType(A_Data.SCHEMA)');
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

      assert.include(actual, 'EntityType(A_Data.SCHEMA)');
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

      assert.include(actual, 'EntityType(A_Data.SCHEMA)');
      assert.notInclude(actual, 'SingletonType');
      assert.include(actual, 'CollectionType');
      assert.include(actual, 'ReferenceType');
    });
    it('can create Infinite Ttl objects', () => {
      const ttl = Ttl.infinite;
      const actual = emptyGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Infinite');
    });
    it('can create Ttls at a valid time resolution', () => {
      const ttl = new Ttl(30, TtlUnits.Day);
      const actual = emptyGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Days(30)');
    });
    it('creates a stable create handle name when the id is missing', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
       
     recipe R
       h0: create persistent 
       h1: create persistent #test
       h2: create persistent #test2
       h3: create persistent #test
       A
         data: writes h0
       A
         data: writes h1
       A
         data: writes h2
       A
         data: writes h3`);
      const actuals: string[] = [];
      for (const handle of manifest.recipes[0].handles) {
        const newActual = await emptyGenerator.createStorageKey(handle);
        assert.match(newActual, /CreateableStorageKey\("handle\/[\w\d]+"\)/); for (const existing of actuals) {
          assert.notDeepEqual(existing, newActual);
        }
        actuals.push(newActual);
      }
    });
    it('creates a stable create handle name from resolved recipes when the id is missing', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
       
     recipe R
       h0: create persistent 
       h1: create persistent #test
       h2: create persistent #test2
       h3: create persistent #test
       A
         data: writes h0
       A
         data: writes h1
       A
         data: writes h2
       A
         data: writes h3`);
      const recipeResolver = new StorageKeyRecipeResolver(manifest);
      const recipes = await recipeResolver.resolve();
      const generator = new PlanGenerator(recipes, '');
      const actuals: string[] = [];
      for (const handle of recipes[0].handles) {
        const newActual = await generator.createStorageKey(handle);
        assert.match(newActual, /CreateableStorageKey\("handle\/[\w\d]+"\)/);
        for (const existing of actuals) {
          assert.notDeepEqual(existing, newActual);
        }
        actuals.push(newActual);
      }
    });
    it('uses the same identifier for all HandleConnections connected to the same handle', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
     particle B
       data: reads Thing {num: Number}
       
     recipe R
       h: create persistent 
       A
         data: writes h
       B
         data: reads h`);
      const recipeResolver = new StorageKeyRecipeResolver(manifest);
      const recipes = await recipeResolver.resolve();
      const generator = new PlanGenerator(recipes, '');
      const plan = await generator.generate();
      const keys = collectOccurrences(plan, 'CreateableStorageKey("', '")');
      assert.lengthOf(keys, 2);
      assert.deepStrictEqual(keys[0], keys[1]);
    });
  });
});
