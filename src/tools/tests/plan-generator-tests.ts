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
import {Ttl} from '../../runtime/capabilities-new.js';
import {StorageKeyRecipeResolver} from '../storage-key-recipe-resolver.js';
import {Capabilities, Capability} from '../../runtime/capabilities.js';

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
    it('can create Infinite Ttl objects', () => {
      const ttl = Ttl.infinite();
      const actual = emptyGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Infinite');
    });
    it('can create Ttls at a valid time resolution', () => {
      const ttl = Ttl.days(30);
      const actual = emptyGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Days(30)');
    });
    it('creates a stable create handle name when the id is missing', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
       
     recipe R
       h0: create @persistent
       h1: create #test @persistent
       h2: create #test2 @persistent
       h3: create #test @persistent
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
        assert.match(newActual, /CreateableStorageKey\("handle\/[\w\d]+"/); for (const existing of actuals) {
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
       h0: create @persistent
       h1: create #test @persistent
       h2: create #test2 @persistent
       h3: create #test @persistent
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
        assert.match(newActual, /CreateableStorageKey\("handle\/[\w\d]+"/);
        for (const existing of actuals) {
          assert.notDeepEqual(existing, newActual);
        }
        actuals.push(newActual);
      }
    });
    it('creates a createable storage key with correct capabilities', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
       
     recipe R
       h0: create
       h1: create @ttl('12h')
       h2: create @persistent
       h3: create @persistent @ttl('24h')
       A
         data: writes h0
       A
         data: writes h1
       A
         data: writes h2
       A
         data: writes h3`);
      const recipeResolver = new StorageKeyRecipeResolver(manifest);
      const recipe = (await recipeResolver.resolve())[0];
      const generator = new PlanGenerator([recipe], '');
      const h0Key = await generator.createStorageKey(recipe.handles[0]);
      assert.isFalse(h0Key.includes('Capabilities'));
      const h1Key = await generator.createStorageKey(recipe.handles[1]);
      assert.match(h1Key, /CreateableStorageKey\("handle\/[\d]+", Capabilities.Queryable\)/);
      const h2Key = await generator.createStorageKey(recipe.handles[2]);
      assert.match(h2Key, /CreateableStorageKey\("handle\/[\d]+", Capabilities.Persistent\)/);
      const h3Key = await generator.createStorageKey(recipe.handles[3]);
      assert.isTrue(h3Key.includes('Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.Queryable))'));
    });
    it('uses the same identifier for all HandleConnections connected to the same handle', async () => {
      const manifest = await Manifest.parse(`\
     particle A
       data: writes Thing {num: Number}
     particle B
       data: reads Thing {num: Number}
       
     recipe R
       h: create 
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
    it('creates particles in the same order as the recipe and not the manifest', async () => {
      const manifest = await Manifest.parse(`\
     particle D in 'particle.D'
       data: reads Thing {num: Number}
     particle C in 'particle.C'
       data: writes Thing {num: Number}
     particle B in 'particle.B'
       data: reads Thing {num: Number}
     particle A in 'particle.A'
       data: writes Thing {num: Number}
       
     recipe R
       h1: create 'id-1' @persistent
       h2: create 'id-2' @persistent
       A
         data: writes h2
       B
         data: reads h2
       C
         data: writes h1
       D
         data: reads h1`);
      const recipeResolver = new StorageKeyRecipeResolver(manifest);
      const recipes = await recipeResolver.resolve();
      const generator = new PlanGenerator(recipes, 'blah');
      const plan = await generator.generate();

      assert.include(plan, 'particle.A');
      assert.include(plan, 'particle.B');
      assert.include(plan, 'particle.C');
      assert.include(plan, 'particle.D');
      assert.isBelow(plan.indexOf('particle.A'), plan.indexOf('particle.B'));
      assert.isBelow(plan.indexOf('particle.B'), plan.indexOf('particle.C'));
      assert.isBelow(plan.indexOf('particle.C'), plan.indexOf('particle.D'));
    });
    it('refers to static constants when translating a single capability', () => {
      const generator = new PlanGenerator([], 'blah');

      assert.deepStrictEqual(
        generator.createCapabilities(Capabilities.persistent),
        `Capabilities.Persistent`
      );
      assert.deepStrictEqual(
        generator.createCapabilities(Capabilities.queryable),
        `Capabilities.Queryable`
      );
      assert.deepStrictEqual(
        generator.createCapabilities(Capabilities.tiedToArc),
        `Capabilities.TiedToArc`
      );
      assert.deepStrictEqual(
        generator.createCapabilities(Capabilities.tiedToRuntime),
        `Capabilities.TiedToRuntime`
      );
    });
    it('constructs a capabilities object when translating multiple capabilities', () => {
      const generator = new PlanGenerator([], 'blah');

      assert.deepStrictEqual(
        generator.createCapabilities(Capabilities.persistentQueryable),
        `Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.Queryable))`
      );
      assert.deepStrictEqual(
        generator.createCapabilities(new Capabilities([Capability.TiedToArc, Capability.Persistent])),
        `Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))`
      );
    });
  });
});
