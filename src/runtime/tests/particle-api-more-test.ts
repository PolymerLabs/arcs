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
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {Runtime} from '../runtime.js';
import {Arc} from '../arc.js';
import {storageKeyPrefixForTest} from '../testing/handle-for-test.js';
import {SingletonEntityStore, CollectionEntityStore, SingletonEntityHandle, CollectionEntityHandle, handleForStore} from '../storage/storage.js';

//
// TODO(sjmiles): deref'ing stores by index is brittle, but `id` provided to create syntax
// doesn't end up on the store, and searching by type or tags is hard (?)
//
const getSingletonData = async (arc: Arc, index: number) => {
  const store = arc._stores[index] as SingletonEntityStore;
  assert.ok(store, `failed to find store[${index}]`);
  const handle: SingletonEntityHandle = await handleForStore(store, arc);
  const data = await handle.fetch();
  assert.ok(data, `store[${index}] was empty`);
  return data;
};

const getCollectionData = async (arc: Arc, index: number) => {
  const store = arc._stores[index] as CollectionEntityStore;
  assert.ok(store, `failed to find store[${index}]`);
  const handle: CollectionEntityHandle = await handleForStore(store, arc);
  const data = await handle.toList();
  assert.ok(data, `store[${index}] was empty`);
  return data;
};

const spawnTestArc = async (loader) => {
  const runtime = new Runtime({loader});
  const arc = runtime.runArc('test-arc', storageKeyPrefixForTest());
  const manifest = await Manifest.load('./manifest', loader);
  const [recipe] = manifest.recipes;
  recipe.normalize();
  await arc.instantiate(recipe);
  await arc.idle;
  return arc;
};

describe('ui-particle-api', () => {

  describe('high-level handle operations', () => {

    it('traps bad handle names', async () => {
      const loader = new Loader(null, {
        './manifest': `
          particle TestParticle in 'test-particle.js'
            result: writes Result {ok: Boolean}
          recipe
            result: create *
            TestParticle
              result: result
        `,
        './test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // normally update should never be async
          async update() {
            try {
              // set a non-existent handle
              await this.set('notreal', {value: 'FooBar'});
            } catch(x) {
              try {
                await this.add('notreal', {value: 'FooBar'});
              } catch(x) {
                try {
                  await this.remove('notreal');
                } catch(x) {
                  try {
                    await this.clear('notreal');
                  } catch(x) {
                    await this.set('result', {ok: true});
                  }
                }
              }
            }
          }
        });`
      });
      //
      const arc = await spawnTestArc(loader);
      //
      const resultData = await getSingletonData(arc, 0);
      assert.ok(resultData.ok, 'failed to throw on bad handle name');
    });

    it('can `set` things', async () => {
      const loader = new Loader(null, {
        './manifest': `
          particle TestParticle in 'test-particle.js'
            // TODO(sjmiles): file issue: bad syntax below results in an error suggesting
            // that "in" is a bad token, which is misleading (the type decl is bad)
            //in Stuff [{value: Text}] stuff
            //
            result: writes Result {ok: Boolean}
            result2: writes Result2 {ok: Boolean}
            stuff: writes [Stuff {value: Text}]
            thing: writes Thing {value: Text}
            thing2: writes Thing2 {value: Text}
          recipe
            // TODO(sjmiles): 'create with id' parses but doesn't work
            stuff: create 'stuff-store'
            thing: create *
            thing2: create *
            result: create *
            result2: create *
            TestParticle
              stuff: stuff
              thing: thing
              thing2: thing2
              result: result
              result2: result2
        `,
        './test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // normally update should never be async
          async update() {
            // set a Singleton with a POJO
            this.set('thing', {value: 'FooBar'});
            // set a Singleton with an Entity
            const entityClass = this.handles.get('thing2').entityClass;
            this.set('thing2', new entityClass({value: 'FooBar'}));
            // try to set a Collection to a value (expect exception)
            try {
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
      const arc = await spawnTestArc(loader);
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
      const loader = new Loader(null, {
        './manifest': `
          particle TestParticle in 'test-particle.js'
            stuff: writes [Stuff {value: Text}]
            thing: writes Thing {value: Text}
            result: writes Result {ok: Boolean}
          recipe
            result: create *
            stuff: create *
            thing: create *
            TestParticle
              result: result
              stuff: stuff
              thing: thing
        `,
        './test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // normally update should never be async
          async update() {
            // add an Entity to a Collection
            this.add('stuff', new (this.handles.get('stuff').entityClass)({value: 'FooBarEntity'}));
            // add an Array of Entities to a Collection
            this.add('stuff', [
              new (this.handles.get('stuff').entityClass)({value: 'FooBarE0'}),
              new (this.handles.get('stuff').entityClass)({value: 'FooBarE1'})
            ]);
            // try to add to a Singleton (expect exception)
            try {
              await this.add(
                  'thing',
                  new (this.handles.get('thing').entityClass)({value: 'OopsStuffIsCollection'}));
            } catch(x) {
              this.set('result', {ok: true});
            }
          }
        });`
      });

      const arc = await spawnTestArc(loader);

      const thingData = await getCollectionData(arc, 1);
      const list = JSON.stringify(thingData.map(thing => thing.value).sort());
      const expected = `["FooBarE0","FooBarE1","FooBarEntity"]`;
      assert.equal(list, expected, 'Collection incorrect after adds');
      const resultData = await getSingletonData(arc, 0);
      assert.ok(resultData.ok, 'failed to throw on adding a value to a Singleton');
      await arc.idle;
    });

    it('can `remove` things', async () => {
      const loader = new Loader(null, {
        './manifest': `
          particle TestParticle in 'test-particle.js'
            stuff: reads writes [Stuff {value: Text}]
            thing: writes Thing {value: Text}
            result: writes Result {ok: Boolean}
          recipe
            result: create *
            stuff: create *
            thing: create *
            TestParticle
              result: result
              stuff: stuff
              thing: thing
        `,
        './test-particle.js': `defineParticle(({SimpleParticle}) => class extends SimpleParticle {
          // normally update should never be async
          async update(inputs, state) {
            if (!state.tested) {
              state.tested = true;
              // add an Array of Entities to a Collection
              await this.add('stuff', [
                new (this.handles.get('stuff').entityClass)({value: 'FooBarP0'}),
                new (this.handles.get('stuff').entityClass)({value: 'FooBarP1'}),
                new (this.handles.get('stuff').entityClass)({value: 'FooBarP2'}),
                new (this.handles.get('stuff').entityClass)({value: 'FooBarP3'})
              ]);
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
      const arc = await spawnTestArc(loader);
      //
      await new Promise(resolve => setTimeout(async () => {
        await arc.idle;
        const thingData = await getCollectionData(arc, 1);
        const list = JSON.stringify(thingData.map(thing => thing.value).sort());
        const expected = `["FooBarP3"]`;
        assert.equal(list, expected, 'Collection incorrect after removes');
        resolve();
      }, 100));
    });
  });
});
