/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Manifest} from '../manifest.js';
import {Runtime} from '../runtime.js';
import {SingletonStorageProvider, CollectionStorageProvider, BigCollectionStorageProvider} from '../storage/storage-provider-base.js';

//
// TODO(sjmiles): deref by index is brittle, but I couldn't attach an id
// and searching by type or tags is hard (?)
//
const getSingletonData = async (arc, index) => {
  const store = arc._stores[index] as SingletonStorageProvider;
  assert.ok(store, `failed to find store[${index}]`);
  const data = await store.get();
  assert.ok(data, `store[${index}] was empty`);
  assert.ok(data.rawData, `store[${index}].rawData was empty`);
  return data.rawData;
}

const getCollectionData = async (arc, index) => {
  const store = arc._stores[index] as CollectionStorageProvider;
  assert.ok(store, `failed to find store[${index}]`);
  const data = await store.toList();
  assert.ok(data, `store[${index}] was empty`);
  return data;
}

describe('ui-particle-api', () => {

  describe('high-level handle operations', () => {

    it('can `set` things', async () => {
      const loader = new StubLoader({
        manifest: `
          particle TestParticle in 'test-particle.js'
            // TODO(sjmiles): file issue: bad syntax below results in an error suggesting
            // that "in" is a bad token, which is misleading (the type decl is bad)
            //in Stuff [{Text value}] stuff
            //
            out Result {Boolean ok} result
            out Result2 {Boolean ok} result2
            out [Stuff {Text value}] stuff
            out Thing {Text value} thing
            out Thing2 {Text value} thing2
          recipe
            // TODO(sjmiles): 'create with id' parses but doesn't work
            create 'stuff-store' as stuff
            create as thing
            create as thing2
            create as result
            create as result2
            TestParticle
              stuff = stuff
              thing = thing
              thing2 = thing2
              result = result
              result2 = result2
        `,
        'test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // TODO(sjmiles): update should never be async
          async update() {
            // set a Singleton with a POJO
            this.set('thing', {value: 'FooBar'});
            // set a Singleton with an Entity
            const entityClass = this.handles.get('thing2').entityClass;
            this.set('thing2', new entityClass({value: 'FooBar'}));
            // try to set a Collection to a value (expect exception)
            try {
              // TODO(sjmiles): await here because in spite of note above because
              // otherwise I couldn't figure out how to capture the exception
              await this.set('stuff', {value: 'OopsStuffIsCollection'});
            } catch(x) {
              this.set('result', {ok: true});
            }
            // try to set a Singleton with an Array (expect exception)
            try {
              await this.set('thing2', [1, 2, 3]);
            } catch(x) {
              this.set('result2', {ok: true});
            }
          }
        });`
      });
      //
      const runtime = new Runtime(loader, FakeSlotComposer);
      const arc = runtime.runArc('test-arc', 'volatile://');
      const manifest = await Manifest.load('manifest', loader);
      const [recipe] = manifest.recipes;
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;
      //
      const thingData = await getSingletonData(arc, 3);
      assert.equal(thingData.value, 'FooBar', 'failed to set a POJO');
      const thing2Data = await getSingletonData(arc, 4);
      assert.equal(thing2Data.value, 'FooBar', 'failed to set an Entity');
      const resultData = await getSingletonData(arc, 0);
      assert.ok(resultData.ok, 'failed to throw on setting a value to a Collection');
      const resultData1 = await getSingletonData(arc, 1);
      assert.ok(resultData1.ok, 'failed to throw on setting a value to a Collection');
    });

    it('can `add` things', async () => {
      const loader = new StubLoader({
        manifest: `
          particle TestParticle in 'test-particle.js'
            out [Stuff {Text value}] stuff
            out Thing {Text value} thing
            out Result {Boolean ok} result
          recipe
            create as result
            create as stuff
            create as thing
            TestParticle
              result = result
              stuff = stuff
              thing = thing
        `,
        'test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // TODO(sjmiles): update should never be async
          async update() {
            // add a POJO to a Collection
            this.add('stuff', {value: 'FooBarPojo'});
            // add an Entity to a Collection
            this.add('stuff', new (this.handles.get('stuff').entityClass)({value: 'FooBarEntity'}));
            // add an Array of POJO to a Collection
            this.add('stuff', [{value: 'FooBarP0'}, {value: 'FooBarP1'}]);
            // add an Array of Entities to a Collection
            this.add('stuff', [
              new (this.handles.get('thing').entityClass)({value: 'FooBarE0'}),
              new (this.handles.get('thing').entityClass)({value: 'FooBarE1'})
            ]);
            // try to add to a Singleton (expect exception)
            try {
              // TODO(sjmiles): await here because in spite of note above because
              // otherwise I couldn't figure out how to capture the exception
              await this.add('thing', {value: 'OopsStuffIsCollection'});
            } catch(x) {
              this.set('result', {ok: true});
            }
          }
        });`
      });
      //
      const runtime = new Runtime(loader, FakeSlotComposer);
      const arc = runtime.runArc('test-arc', 'volatile://');
      const manifest = await Manifest.load('manifest', loader);
      const [recipe] = manifest.recipes;
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;
      //
      const thingData = await getCollectionData(arc, 1);
      const list = JSON.stringify(thingData.map(thing => thing.rawData.value).sort());
      const expected = `["FooBarE0","FooBarE1","FooBarEntity","FooBarP0","FooBarP1","FooBarPojo"]`;
      assert.equal(list, expected, 'Collection incorrect after adds')
      const resultData = await getSingletonData(arc, 0);
      assert.ok(resultData.ok, 'failed to throw on adding a value to a Singleton');
    });

    it('can `remove` things', async () => {
      const loader = new StubLoader({
        manifest: `
          particle TestParticle in 'test-particle.js'
            inout [Stuff {Text value}] stuff
            out Thing {Text value} thing
            out Result {Boolean ok} result
          recipe
            create as result
            create as stuff
            create as thing
            TestParticle
              result = result
              stuff = stuff
              thing = thing
        `,
        'test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // TODO(sjmiles): update should never be async
          async update(inputs, state) {
            if (!state.tested) {
              state.tested = true;
              // add an Array of POJO to a Collection
              await this.add('stuff', [{value: 'FooBarP0'}, {value: 'FooBarP1'}, {value: 'FooBarP2'}, {value: 'FooBarP3'}]);
              // remove an Entity
              const items = await this.handles.get('stuff').toList();
              await this.remove('stuff', items[0]);
              // remove an array of Entities
              await this.remove('stuff', [items[1], items[2]]);
              // try to remove a POJO (no op; would be type-error in TS)
              await this.remove('stuff', {value: 'FooBarP3'});
            }
          }
        });`
      });
      //
      const runtime = new Runtime(loader, FakeSlotComposer);
      const arc = runtime.runArc('test-arc', 'volatile://');
      const manifest = await Manifest.load('manifest', loader);
      const [recipe] = manifest.recipes;
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;
      //
      const thingData = await getCollectionData(arc, 1);
      const list = JSON.stringify(thingData.map(thing => thing.rawData.value).sort());
      const expected = `["FooBarP3"]`;
      assert.equal(list, expected, 'Collection incorrect after removes')
    });

  });

});
