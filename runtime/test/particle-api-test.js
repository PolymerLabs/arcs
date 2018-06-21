/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../manifest.js';
import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {Arc} from '../arc.js';
import {StubLoader} from '../testing/stub-loader.js';
import {TestHelper} from '../testing/test-helper.js';

async function loadFilesIntoNewArc(fileMap) {
  const testHelper = new TestHelper({loader: new StubLoader(fileMap)});
  await testHelper.loadManifest('manifest');
  return {
    arc: testHelper.arc,
    manifest: testHelper.arc._context
  };
}

describe('particle-api', function() {
  it('StorageProxy integration test', async function() {
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Data = manifest.findSchemaByName('Data').entityClass();
    let fooStore = await arc.createStore(Data.type, 'foo', 'test:0');
    let resStore = await arc.createStore(Data.type.collectionOf(), 'res', 'test:1');
    let inspector = new util.ResultInspector(arc, resStore, 'value');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();

    await arc.instantiate(recipe);
    await inspector.verify('sync:null');

    // Drop event 2; desync is triggered by v3.
    await fooStore.set(new Data({value: 'v1'}));
    let fireFn = fooStore._fire;
    fooStore._fire = () => {};
    await fooStore.set(new Data({value: 'v2'}));
    fooStore._fire = fireFn;
    await fooStore.set(new Data({value: 'v3'}));
    await inspector.verify('update:{"data":{"rawData":{"value":"v1"}}}',
                           'desync',
                           'sync:{"rawData":{"value":"v3"}}');

    await fooStore.clear();
    await inspector.verify('update:{"data":null}');
  });

  it('contains a constructInnerArc call', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultStore = await arc.createStore(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    let newStore = arc.findStoresByType(Result.type)[1];
    assert.equal(newStore.name, 'hello');
    await util.assertSingletonIs(newStore, 'value', 'success');
  });

  it('can load a recipe', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultStore = await arc.createStore(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    let newStore = arc.findStoresByType(Result.type)[2];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('can load a recipe referencing a manifest store', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultStore = await arc.createStore(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    let newStore = arc.findStoresByType(Result.type)[2];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('can load a recipe referencing a tagged handle in containing arc', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultStore = await arc.createStore(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    let newStore = arc.findStoresByType(Result.type)[2];
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
    let {manifest, arc} = await loadFilesIntoNewArc({
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultStore = await arc.createStore(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, resultStore, 'value', 'done');
    let newStore = arc.findStoresByType(Result.type)[2];
    assert.equal(newStore.name, 'the-out');
    await util.assertSingletonWillChangeTo(arc, newStore, 'value', 'success');
  });

  it('multiplexing', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
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
                let inHandle = await this.arc.createHandle(this.resHandle.type.primitiveType(), 'the-in');
                let outHandle = await this.arc.createHandle(this.resHandle.type.primitiveType(), 'the-out', this);
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

    let Result = manifest.findSchemaByName('Result').entityClass();
    let inputsStore = await arc.createStore(Result.type.collectionOf(), undefined, 'test:1');
    inputsStore.store({id: '1', rawData: {value: 'hello'}});
    inputsStore.store({id: '2', rawData: {value: 'world'}});
    let resultsStore = await arc.createStore(Result.type.collectionOf(), undefined, 'test:2');
    let inspector = new util.ResultInspector(arc, resultsStore, 'value');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(inputsStore);
    recipe.handles[1].mapToStorage(resultsStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await inspector.verify('done', 'done', 'HELLO', 'WORLD');

    // TODO: how do i listen to inner arc's outStore handle-changes?
    // await util.assertCollectionWillChangeTo(resultsStore, Result, "value", ["HELLO", "WORLD"]);

    let newStore = arc.findStoresByType(Result.type)[1];
    assert.equal(newStore.name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    await util.assertSingletonIs(newStore, 'value', 'HELLO');

    newStore = arc.findStoresByType(Result.type)[3];
    assert.equal(newStore.name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    await util.assertSingletonIs(newStore, 'value', 'WORLD');
  });
});
