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
import {Recipe} from '../../runtime/recipe/recipe.js';

const randomSalt = 'test-random-seed';

describe('recipe2plan', () => {
  describe('plan-generator', () => {
    it('imports arcs.core.data when the package is different', () => {
      const generator = new PlanGenerator([], 'some.package', randomSalt);

      const actual = generator.fileHeader();

      assert.include(actual, 'import arcs.core.data.*');
    });
    it('does not import arcs.core.data when the package is the same', () => {
      const generator = new PlanGenerator([], 'arcs.core.data', randomSalt);

      const actual = generator.fileHeader();

      assert.notInclude(actual, 'import arcs.core.data.*');
    });
    it('can create Infinite Ttl objects', () => {
      const ttl = Ttl.infinite();
      const actual = PlanGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Infinite');
    });
    it('can create Ttls at a valid time resolution', () => {
      const ttl = Ttl.days(30);
      const actual = PlanGenerator.createTtl(ttl);
      assert.deepStrictEqual(actual, 'Ttl.Days(30)');
    });
    it('creates a unique identifiers for create handles with no id', async () => {
      const {recipes, generator} = await process(`
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

      assert.deepEqual(
        await Promise.all(recipes[0].handles.map(h => generator.createStorageKey(h))), [
        'CreateableStorageKey("f737c995c77b2ff1399521941b82d1045da61daf", Capabilities.Persistent)',
        'CreateableStorageKey("6b8932a97188a3c9da089604035c80afa72d6fab", Capabilities.Persistent)',
        'CreateableStorageKey("399c4cefdc8a611a6aedb43b7cb6497e36e89896", Capabilities.Persistent)',
        'CreateableStorageKey("088b16e75e8a4d44ef92e1bb497370e8ab108053", Capabilities.Persistent)'
      ]);
    });
    it('uses the same identifier for created and mapped handle', async () => {
      const {recipes, generator} = await process(`
        particle A
          data: writes Thing {num: Number}
        particle B
          data: reads Thing {num: Number}
        
        @arcId('ingestion')
        recipe Ingest
          h: create 'data' @persistent
          A
            data: writes h
        
        recipe Retrieve
          h: map 'data'
          B
            data: reads h`);

      assert.equal(
        await generator.createStorageKey(recipes.find(r => r.name === 'Ingest').handles[0]),
        'StorageKeyParser.parse("db://66ab3cd8dbc1462e9bcfba539dfa5c852558ad64@arcs/!:ingestion/handle/data")'
      );
      assert.equal(
        await generator.createStorageKey(recipes.find(r => r.name === 'Retrieve').handles[0]),
        'StorageKeyParser.parse("db://66ab3cd8dbc1462e9bcfba539dfa5c852558ad64@arcs/!:ingestion/handle/data")'
      );
    });
    it('creates a createable storage key with correct capabilities', async () => {
      const {recipes, generator} = await process(`
        particle A
          data: writes Thing {num: Number}
          
        recipe R
          h0: create
          h1: create @ttl('12h')
          h2: create @persistent
          h3: create @tiedToArc @ttl('24h')
          A
            data: writes h0
          A
            data: writes h1
          A
            data: writes h2
          A
            data: writes h3`);

      assert.deepEqual(
        await Promise.all(recipes[0].handles.map(h => generator.createStorageKey(h))), [
'CreateableStorageKey("f737c995c77b2ff1399521941b82d1045da61daf")',
// TODO: Investigate if Queryable should be here? If so, explain with a comment.
'CreateableStorageKey("6b8932a97188a3c9da089604035c80afa72d6fab", Capabilities.Queryable)',
'CreateableStorageKey("399c4cefdc8a611a6aedb43b7cb6497e36e89896", Capabilities.Persistent)',
// TODO: Investigate if Queryable should be here? If so, explain with a comment.
`CreateableStorageKey(
    "088b16e75e8a4d44ef92e1bb497370e8ab108053",
    Capabilities(setOf(Capabilities.Capability.Queryable, Capabilities.Capability.TiedToArc))
)`
      ]);
    });
    it('uses the same identifier for all HandleConnections connected to the same handle', async () => {
      const {recipes, generator} = await process(`
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

      const [writer, reader] = recipes[0].particles;

      assert.equal(
        await generator.createHandleConnection(writer.connections['data']),
`HandleConnection(
    CreateableStorageKey("f737c995c77b2ff1399521941b82d1045da61daf"),
    HandleMode.Write,
    SingletonType(EntityType(A_Data.SCHEMA)),
    Ttl.Infinite
)`
      );
      assert.equal(
        await generator.createHandleConnection(reader.connections['data']),
`HandleConnection(
    CreateableStorageKey("f737c995c77b2ff1399521941b82d1045da61daf"),
    HandleMode.Read,
    SingletonType(EntityType(B_Data.SCHEMA)),
    Ttl.Infinite
)`
      );
    });
    it('creates particles in the same order as the recipe and not the manifest', async () => {
      const {plan} = await process(`
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

      assert.include(plan, 'particle.A');
      assert.include(plan, 'particle.B');
      assert.include(plan, 'particle.C');
      assert.include(plan, 'particle.D');
      assert.isBelow(plan.indexOf('particle.A'), plan.indexOf('particle.B'));
      assert.isBelow(plan.indexOf('particle.B'), plan.indexOf('particle.C'));
      assert.isBelow(plan.indexOf('particle.C'), plan.indexOf('particle.D'));
    });
    it('refers to static constants when translating a single capability', () => {
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(Capabilities.persistent),
        `Capabilities.Persistent`
      );
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(Capabilities.queryable),
        `Capabilities.Queryable`
      );
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(Capabilities.tiedToArc),
        `Capabilities.TiedToArc`
      );
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(Capabilities.tiedToRuntime),
        `Capabilities.TiedToRuntime`
      );
    });
    it('constructs a capabilities object when translating multiple capabilities', () => {
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(Capabilities.persistentQueryable),
        `Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.Queryable))`
      );
      assert.deepStrictEqual(
        PlanGenerator.createCapabilities(new Capabilities([Capability.TiedToArc, Capability.Persistent])),
        `Capabilities(setOf(Capabilities.Capability.Persistent, Capabilities.Capability.TiedToArc))`
      );
    });
  });
  async function process(manifestString: string): Promise<{
      recipes: Recipe[],
      generator: PlanGenerator,
      plan: string
  }> {
    const manifest = await Manifest.parse(manifestString);
    const recipes = await new StorageKeyRecipeResolver(manifest).resolve();
    const generator = new PlanGenerator(recipes, 'test.namespace', randomSalt);
    const plan = await generator.generate();
    return {recipes, generator, plan};
  }
});
