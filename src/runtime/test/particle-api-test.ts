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
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';
import * as util from '../testing/test-util.js';
import {Arc} from '../arc.js';
import {Description} from '../description.js';
import {IdGenerator} from '../id.js';
import {Manifest} from '../manifest.js';
import {Schema} from '../schema.js';
import {EntityType} from '../type.js';
import {Runtime} from '../runtime.js';
import {SingletonStore} from '../store.js';
import {Speculator} from '../../planning/speculator.js';
import {SingletonStorageProvider, CollectionStorageProvider, BigCollectionStorageProvider} from '../storage/storage-provider-base.js';

async function loadFilesIntoNewArc(fileMap: {[index:string]: string, manifest: string}): Promise<Arc> {
  const manifest = await Manifest.parse(fileMap.manifest);
  const runtime = new Runtime(new StubLoader(fileMap), FakeSlotComposer, manifest);
  return runtime.newArc('demo', 'volatile://');
}

describe('particle-api', () => {
  it('StorageProxy integration test', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          Text value

        particle P in 'a.js'
          in Data foo
          out [Data] res

        recipe
          use 'test:0' as handle0
          use 'test:1' as handle1
          P
            foo <- handle0
            res -> handle1
      `,
      'a.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class P extends Particle {
            setHandles(handles) {
              handles.get('foo').configure({notifyDesync: true});
              this.resHandle = handles.get('res');
            }

            onHandleSync(handle, model) {
              this.addResult('sync:' + JSON.stringify(model));
            }

            onHandleUpdate(handle, update) {
              this.addResult('update:' + JSON.stringify(update));
            }

            onHandleDesync(handle) {
              this.addResult('desync');
            }

            async addResult(value) {
              await this.resHandle.store(new this.resHandle.entityClass({value}));
            }
          }
        });
      `
    });

    const data = arc.context.findSchemaByName('Data').entityClass();
    const fooStore = await arc.createStore(data.type, 'foo', 'test:0') as SingletonStorageProvider;
    const resStore = await arc.createStore(data.type.collectionOf(), 'res', 'test:1');
    const inspector = new util.ResultInspector(arc, resStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();

    await arc.instantiate(recipe);
    await inspector.verify('sync:null');

    // Drop event 2; desync is triggered by v3.
    await fooStore.set({id: 'id1', rawData: {value: 'v1'}});
    const fireFn = fooStore['_fire'];
    fooStore['_fire'] = async () => {};
    await fooStore.set({id: 'id2', rawData: {value: 'v2'}});
    fooStore['_fire'] = fireFn;
    await fooStore.set({id: 'id3', rawData: {value: 'v3'}});
    await inspector.verify('update:{"data":{"value":"v1"},"oldData":null}',
                           'desync',
                           'sync:{"value":"v3"}');

    // Check it includes the previous value (v3) in updates.
    await fooStore.set({id: 'id4', rawData: {value: 'v4'}});
    await inspector.verify('update:{"data":{"value":"v4"},"oldData":{"value":"v3"}}');

    // Check clearing the store.
    await fooStore.clear();
    await inspector.verify('update:{"data":null,"oldData":{"value":"v4"}}');
  });

  it('can sync/update and store/remove with collections', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          inout [Result] result

        recipe
          use 'result-handle' as handle0
          P
            result = handle0
      `,
      'a.js': `
        defineParticle(({Particle}) => {
          return class P extends Particle {
            onHandleSync(handle, model) {
              let result = handle;
              result.store(new result.entityClass({value: 'one'}));
              result.store(new result.entityClass({value: 'two'}));
            }
            async onHandleUpdate(handle) {
              for (let entity of await handle.toList()) {
                if (entity.value == 'one') {
                  handle.remove(entity);
                }
              }
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type.collectionOf(), undefined, 'result-handle') as CollectionStorageProvider;
    const recipe = arc.context.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    const values = (await resultStore.toList()).map(item => item.rawData.value);
    assert.deepEqual(values, ['two']);
  });

  it('contains a constructInnerArc call', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use as handle0
          P
            result -> handle0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let arc = await this.constructInnerArc();
              var resultHandle = handles.get('result');
              let handle = await arc.createHandle(resultHandle.type, "hello");
              handle.set(new resultHandle.entityClass({value: 'success'}));
              resultHandle.set(new resultHandle.entityClass({value: 'done'}));
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[0];
    assert.equal(newStore.name, 'hello');
    await util.assertSingletonIs(newStore, 'value', 'success');
  });

  it('can load a recipe', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use 'test:1' as handle0
          P
            result -> handle0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let arc = await this.constructInnerArc();
              var resultHandle = handles.get('result');
              let inHandle = await arc.createHandle(resultHandle.type, "the-in");
              let outHandle = await arc.createHandle(resultHandle.type, "the-out");
              try {
                await arc.loadRecipe(\`
                  schema Result
                    Text value

                  particle PassThrough in 'pass-through.js'
                    in Result a
                    out Result b

                  recipe
                    use '\${inHandle._id}' as handle1
                    use '\${outHandle._id}' as handle2
                    PassThrough
                      a <- handle1
                      b -> handle2

                \`);
                inHandle.set(new resultHandle.entityClass({value: 'success'}));
                resultHandle.set(new resultHandle.entityClass({value: 'done'}));
              } catch (e) {
                resultHandle.set(new resultHandle.entityClass({value: e}));
              }
            }
          }
        });
      `,
      'pass-through.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setHandles(handles) {
              handles.get('a').get().then(result => {
                handles.get('b').set(result);
              });
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('can load a recipe referencing a manifest store', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use 'test:1' as handle0
          P
            result -> handle0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let arc = await this.constructInnerArc();
              var resultHandle = handles.get('result');
              let inHandle = await arc.createHandle(resultHandle.type, "the-in");
              let outHandle = await arc.createHandle(resultHandle.type, "the-out");
              try {
                await arc.loadRecipe(\`
                  schema Result
                    Text value

                  store NobId of NobIdStore {Text nobId} in NobIdJson
                   resource NobIdJson
                     start
                     [{"nobId": "12345"}]

                   particle PassThrough in 'pass-through.js'
                     in NobIdStore {Text nobId} nobId
                     in Result a
                     out Result b

                   recipe
                     map NobId as nobId
                     use '\${inHandle._id}' as handle1
                     use '\${outHandle._id}' as handle2
                     PassThrough
                       nobId <- nobId
                       a <- handle1
                       b -> handle2

                \`);
                inHandle.set(new resultHandle.entityClass({value: 'success'}));
                resultHandle.set(new resultHandle.entityClass({value: 'done'}));
              } catch (e) {
                resultHandle.set(new resultHandle.entityClass({value: e}));
              }
            }
          }
        });
      `,
      'pass-through.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setHandles(handles) {
              handles.get('a').get().then(resultA => {
                handles.get('nobId').get().then(resultNob => {
                  if (resultNob.nobId === '12345') {
                    handles.get('b').set(resultA);
                  }
                })
              });
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('can load a recipe referencing a tagged handle in containing arc', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        schema Foo
          Text bar

        particle P in 'a.js'
          out Result result
          in Foo target

        recipe
          use 'test:1' as handle0
          create #target as target
          P
            result -> handle0
            target <- target
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let arc = await this.constructInnerArc();
              var resultHandle = handles.get('result');
              let inHandle = await arc.createHandle(resultHandle.type, "the-in");
              let outHandle = await arc.createHandle(resultHandle.type, "the-out");
              try {
                await arc.loadRecipe(\`
                   schema Foo
                     Text bar

                   schema Result
                     Text value

                   particle PassThrough in 'pass-through.js'
                     in Foo target
                     in Result a
                     out Result b

                   recipe
                     use #target as target
                     use '\${inHandle._id}' as handle1
                     use '\${outHandle._id}' as handle2
                     PassThrough
                       target <- target
                       a <- handle1
                       b -> handle2

                \`);
                inHandle.set(new resultHandle.entityClass({value: 'success'}));
                resultHandle.set(new resultHandle.entityClass({value: 'done'}));
              } catch (e) {
                resultHandle.set(new resultHandle.entityClass({value: e}));
              }
            }
          }
        });
      `,
      'pass-through.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setHandles(handles) {
              handles.get('a').get().then(resultA => {
                handles.get('target').get().then(resultTarget => {
                  handles.get('b').set(resultA);
                })
              });
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  // TODO(wkorman): The below test fails and is currently skipped as we're only
  // running basic recipe resolution, and `use` ends up in
  // `arc.findStoresByType` which doesn't fall back to considering handles in
  // the arc's context as does, for example, `arc.findStoreById`. We could
  // potentially address either by including more strategies in the particle
  // execution host's strategizer or adding such fallback to
  // `arc.findStoresByType`.
  it.skip('can load a recipe referencing a tagged handle in manifest', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        store NobId of NobIdStore {Text nobId} #target in NobIdJson
         resource NobIdJson
           start
           [{"nobId": "12345"}]

        particle P in 'a.js'
          out Result result

        recipe
          use 'test:1' as handle0
          P
            result -> handle0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let arc = await this.constructInnerArc();
              var resultHandle = handles.get('result');
              let inHandle = await arc.createHandle(resultHandle.type, "the-in");
              let outHandle = await arc.createHandle(resultHandle.type, "the-out");
              try {
                await arc.loadRecipe(\`
                   schema Result
                     Text value

                   particle PassThrough in 'pass-through.js'
                     in NobIdStore {Text nobId} target
                     in Result a
                     out Result b

                   recipe
                     use #target as target
                     use '\${inHandle._id}' as handle1
                     use '\${outHandle._id}' as handle2
                     PassThrough
                       target <- target
                       a <- handle1
                       b -> handle2

                \`);
                inHandle.set(new resultHandle.entityClass({value: 'success'}));
                resultHandle.set(new resultHandle.entityClass({value: 'done'}));
              } catch (e) {
                resultHandle.set(new resultHandle.entityClass({value: e}));
              }
            }
          }
        });
      `,
      'pass-through.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setHandles(handles) {
              handles.get('a').get().then(resultA => {
                handles.get('target').get().then(resultNob => {
                  if (resultNob.nobId === '12345') {
                    handles.get('b').set(resultA);
                  }
                })
              });
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('multiplexing', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          in [Result] inputs
          inout [Result] results

        recipe
          use 'test:1' as handle0
          use 'test:2' as handle1
          P
            inputs <- handle0
            results = handle1
      `,
      'a.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              this.arc = await this.constructInnerArc();
              this.resHandle = handles.get('results');
            }
            async onHandleSync(handle, model) {
              if (handle.name !== 'inputs')
                return;
              for (let input of model) {
                let inHandle = await this.arc.createHandle(this.resHandle.type.getContainedType(), 'the-in');
                let outHandle = await this.arc.createHandle(this.resHandle.type.getContainedType(), 'the-out', this);
                try {
                  let done = await this.arc.loadRecipe(\`
                    schema Result
                      Text value

                    particle PassThrough in 'pass-through.js'
                      in Result a
                      out Result b

                    recipe
                      use '\${inHandle._id}' as handle1
                      use '\${outHandle._id}' as handle2
                      PassThrough
                        a <- handle1
                        b -> handle2
                  \`);
                  inHandle.set(input);
                  this.resHandle.store(new this.resHandle.entityClass({value: 'done'}));
                } catch (e) {
                  this.resHandle.store(new this.resHandle.entityClass({value: e}));
                }
              }
            }
            async onHandleUpdate(handle, update) {
              if (handle.name === 'the-out') {
                this.resHandle.store(update.data);
              }
            }
          }
        });
      `,
      'pass-through.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setHandles(handles) {
              this.bHandle = handles.get('b');
            }
            onHandleSync(handle, model) {
              if (handle.name === 'a') {
                this.bHandle.set(new this.bHandle.entityClass({value:model.value.toUpperCase()}));
              }
            }
          }
        });
      `
    });

    const result = arc.context.findSchemaByName('Result').entityClass();
    const inputsStore = await arc.createStore(result.type.collectionOf(), undefined, 'test:1') as CollectionStorageProvider;
    await inputsStore.store({id: '1', rawData: {value: 'hello'}}, ['key1']);
    await inputsStore.store({id: '2', rawData: {value: 'world'}}, ['key2']);
    const resultsStore = await arc.createStore(result.type.collectionOf(), undefined, 'test:2');
    const inspector = new util.ResultInspector(arc, resultsStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(inputsStore);
    recipe.handles[1].mapToStorage(resultsStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    await inspector.verify('done', 'done', 'HELLO', 'WORLD');

    // TODO: how do i listen to inner arc's outStore handle-changes?
    // await util.assertCollectionWillChangeTo(resultsStore, Result, "value", ["HELLO", "WORLD"]);

    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const innerArcStores = innerArc.findStoresByType(result.type);

    let newStore = innerArcStores[1];
    assert.equal(innerArcStores[1].name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    await util.assertSingletonIs(newStore, 'value', 'HELLO');

    newStore = innerArcStores[3];
    assert.equal(newStore.name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    await util.assertSingletonIs(newStore, 'value', 'WORLD');
  });

  it('big collection store and remove', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          Text value

        particle P in 'a.js'
          inout BigCollection<Data> big

        recipe
          use 'test:0' as handle0
          P
            big = handle0
      `,
      'a.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              let collection = await handles.get('big');
              await collection.store(new collection.entityClass({value: 'finn'}));
              let toRemove = new collection.entityClass({value: 'barry'});
              await collection.store(toRemove);
              await collection.store(new collection.entityClass({value: 'jake'}));
              await collection.remove(toRemove);
              await collection.remove(new collection.entityClass({value: 'no one'}));
            }
          }
        });
      `
    });

    const dataClass = arc.context.findSchemaByName('Data').entityClass();
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), 'big', 'test:0') as BigCollectionStorageProvider;
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(bigStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    const cursorId = await bigStore.stream(5);
    const data = await bigStore.cursorNext(cursorId);
    assert.deepEqual(data.value.map(item => item.rawData.value), ['finn', 'jake']);
  });

  it('big collection streamed reads', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          Text value

        particle P in 'a.js'
          in BigCollection<Data> big
          out [Data] res

        recipe
          use 'test:0' as handle0
          use 'test:1' as handle1
          P
            big <- handle0
            res -> handle1
      `,
      'a.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setHandles(handles) {
              this.resHandle = handles.get('res');
              let cursor = await handles.get('big').stream({pageSize: 3});
              for (let i = 0; i < 3; i++) {
                let {value, done} = await cursor.next();
                if (done) {
                  this.addResult('done');
                  return;
                }
                this.addResult(value.map(item => item.rawData.value).join(','));
              }
              this.addResult('error - cursor did not terminate correctly');
            }

            async addResult(value) {
              await this.resHandle.store(new this.resHandle.entityClass({value}));
            }
          }
        });
      `
    });

    const dataClass = arc.context.findSchemaByName('Data').entityClass();
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), 'big', 'test:0') as BigCollectionStorageProvider;
    const promises: Promise<void>[] = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(bigStore.store({id: 'i' + i, rawData: {value: 'v' + i}}, ['k' + i]));
    }
    await Promise.all(promises);

    const resStore = await arc.createStore(dataClass.type.collectionOf(), 'res', 'test:1');
    const inspector = new util.ResultInspector(arc, resStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(bigStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await inspector.verify('v1,v2,v3', 'v4,v5', 'done');
  });

  it('particles can indicate that they are busy in setHandles', async () => {
    const loader = new StubLoader({
      manifest: `
        particle CallsBusy in 'callsBusy.js'
          in * {} bar
          out * {Text result} far

        recipe
          use 'test:0' as foo
          use 'test:1' as faz
          CallsBusy
            bar <- foo
            far -> faz
      `,
      'callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.startBusy();
              this.out = handles.get('far');
            }
            async onHandleSync(handle, model) {
              setTimeout(async () => {
                this.out.set(new this.out.entityClass({result: 'hi'}));
                this.doneBusy();
              }, 100);
            }
          }
        });
      `
    });
    
    const id = IdGenerator.createWithSessionIdForTesting('session').newArcId('test');
    const arc = new Arc({id, loader, context: null});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();
    
    await arc.instantiate(recipe);

    await (inStore as unknown as SingletonStore).set({id: '1', rawData: {}}, 'a');
    await arc.idle;
    await util.assertSingletonIs(outStore, 'result', 'hi');
  });

  it('particles can indicate that they are busy in onHandleSync', async () => {
    const loader = new StubLoader({
      manifest: `
        particle CallsBusy in 'callsBusy.js'
          in * {} bar
          out * {Text result} far

        recipe
          use 'test:0' as foo
          use 'test:1' as faz
          CallsBusy
            bar <- foo
            far -> faz
      `,
      'callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.out = handles.get('far');
            }
            async onHandleSync(handle, model) {
              await handle.get();
              this.startBusy();
              setTimeout(async () => {
                await this.out.set(new this.out.entityClass({result: 'hi'}));
                this.doneBusy();
              }, 100);
            }
          }
        });
      `
    });
    
    const id = IdGenerator.createWithSessionIdForTesting('session').newArcId('test');
    const arc = new Arc({id, loader, context: null});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();
    
    await arc.instantiate(recipe);

    await (inStore as unknown as SingletonStore).set({id: '1', rawData: {}}, 'a');
    await arc.idle;
    await util.assertSingletonIs(outStore, 'result', 'hi');
  });

  it('particles can indicate that they are busy in onHandleUpdate', async () => {
    const loader = new StubLoader({
      manifest: `
        particle CallsBusy in 'callsBusy.js'
          in * {} bar
          out * {Text result} far

        recipe
          use 'test:0' as foo
          use 'test:1' as faz
          CallsBusy
            bar <- foo
            far -> faz
      `,
      'callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.out = handles.get('far');
            }
            async onHandleUpdate(handle, update) {
              await handle.get();
              this.startBusy();
              setTimeout(async () => {
                await this.out.set(new this.out.entityClass({result: 'hi'}));
                this.doneBusy();
              }, 100);
            }
          }
        });
      `
    });
    
    const id = IdGenerator.createWithSessionIdForTesting('session').newArcId('test');
    const arc = new Arc({id, loader, context: null});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();
    
    await arc.instantiate(recipe);

    await arc.idle;
    await (inStore as unknown as SingletonStore).set({id: '1', rawData: {}}, 'a');
    await arc.idle;
    await util.assertSingletonIs(outStore, 'result', 'hi');
  });

  it('particles call startBusy in setHandles and set values in descriptions', async () => {
    const loader = new StubLoader({
      manifest: `
        particle CallsBusy in 'callsBusy.js'
          in * {} bar
          out * {Text result} far
          description \`out is \${far.result}!\`
        recipe
          use 'test:0' as h0
          use 'test:1' as h1
          CallsBusy
            bar <- h0
            far -> h1
      `,
      'callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.startBusy();
              this.out = handles.get('far');
            }
            async onHandleSync(handle, model) {
              setTimeout(async () => {
                this.out.set(new this.out.entityClass({result: 'hi'}));
                this.doneBusy();
              }, 100);
            }
          }
        });
      `
    });

     const id = IdGenerator.createWithSessionIdForTesting('session').newArcId('test');
    const arc = new Arc({id, loader, context: null});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];

     const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'h0', 'test:0');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'h1', 'test:1');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();

     const {speculativeArc, relevance} = await (new Speculator()).speculate(arc, recipe, 'recipe-hash');
    const description = await Description.create(speculativeArc, relevance);
    assert.equal(description.getRecipeSuggestion(), 'Out is hi!');
  });

   it('particles call startBusy in setHandles with no value and set values in descriptions', async () => {
    const loader = new StubLoader({
      manifest: `
        particle SetBar in 'setBar.js'
          out * {} bar
        particle CallsBusy in 'callsBusy.js'
          in * {} bar
          out * {Text result} far
          description \`out is \${far.result}!\`
        recipe
          create as h0
          create as h1
          SetBar
            bar -> h0
          CallsBusy
            bar <- h0
            far -> h1
      `,
      'setBar.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.bar = handles.get('bar');
              this.bar.set(new this.bar.entityClass({}));
            }
          }
        });
      `,
      'callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.startBusy();
              this.out = handles.get('far');
            }
            async onHandleSync(handle, model) {
              setTimeout(async () => {
                this.out.set(new this.out.entityClass({result: 'hi'}));
                this.doneBusy();
              }, 100);
            }
          }
        });
      `
    });

     const id = IdGenerator.createWithSessionIdForTesting('session').newArcId('test');
    const arc = new Arc({id, loader, context: null});
    const manifest = await Manifest.load('manifest', loader);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());

     const {speculativeArc, relevance} = await (new Speculator()).speculate(arc, recipe, 'recipe-hash');
    const description = await Description.create(speculativeArc, relevance);
    assert.equal(description.getRecipeSuggestion(), 'Out is hi!');
  });

  it('loadRecipe returns ids of provided slots', async () => {
    const context = await Manifest.parse(`
      particle TransformationParticle in 'TransformationParticle.js'
        consume root

      recipe
        slot 'rootslotid-root' as slot0
        TransformationParticle
          consume root as slot0`);

    const loader = new StubLoader({
      'TransformationParticle.js': `defineParticle(({DomParticle}) => {
        return class extends DomParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');
      
            const {providedSlotIds} = await innerArc.loadRecipe(\`
              particle A in 'A.js'
                consume content
                  provide detail
  
              recipe
                slot '\` + hostedSlotId + \`' as hosted
                A as a
                  consume content as hosted
            \`);

            await innerArc.loadRecipe(\`
              particle B in 'B.js'
                consume detail
              
              recipe
                slot '\` + providedSlotIds['a.detail'] + \`' as detail
                B
                  consume detail as detail
            \`);
          }
      
          renderHostedSlot(slotName, hostedSlotId, content) {}
        };
      });`,
      '*': `defineParticle(({DomParticle}) => class extends DomParticle {});`,
    });
    // TODO(lindner): add strict rendering
    const slotComposer = new MockSlotComposer({strict: false}).newExpectations('debug');
    const arc = new Arc({id: IdGenerator.newSession().newArcId('demo'),
        storageKey: 'key', loader, slotComposer, context});
    const [recipe] = arc.context.recipes;
    recipe.normalize();

    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc.activeRecipe.particles, 1);
    const [transformationParticle] = arc.activeRecipe.particles;

    assert.lengthOf(arc.recipeDeltas, 1);
    const [innerArc] = arc.findInnerArcs(transformationParticle);

    const sessionId = innerArc.idGeneratorForTesting.currentSessionIdForTesting;
    assert.equal(innerArc.activeRecipe.toString(), `recipe
  slot '!${sessionId}:demo:inner2:1' as slot0
  slot 'slotid-!${sessionId}:demo:inner2:2' as slot1
  A as particle0
    consume content as slot0
      provide detail as slot1
  B as particle1
    consume detail as slot1`,
    'Particle B should consume the detail slot provided by particle A');
  });
});
