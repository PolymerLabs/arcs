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
import * as util from './test-util.js';
import {Arc} from '../arc.js';
import {MessageChannel} from '../message-channel.js';
import {InnerPEC} from '../inner-PEC.js';
import {Loader} from '../loader.js';

async function loadFilesIntoNewArc(fileMap) {
  let registry = {};
  let loader = new class extends Loader {
    loadResource(path) {
      return fileMap[path];
    }
    path(fileName) {
      return fileName;
    }
    join(_, file) {
      return file;
    }
  };
  let manifest = await Manifest.load('manifest', loader, {registry});
  let pecFactory = function(id) {
    let channel = new MessageChannel();
    new InnerPEC(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
  let arc = new Arc({id: 'test', pecFactory, loader});
  return {manifest, arc};
}

async function setupProxySyncTests(config = '') {
  let {manifest, arc} = await loadFilesIntoNewArc({
    manifest: `
      schema Data
        Text value

      particle P in 'a.js'
        in Data foo
        inout [Data] bar
        out [Data] res

      recipe
        use 'test:0' as view0
        use 'test:1' as view1
        use 'test:2' as view2
        P
          foo <- view0
          bar = view1
          res -> view2
    `,
    'a.js': `
      'use strict';

      defineParticle(({Particle}) => {
        return class P extends Particle {
          setViews(views) {
            this._resHandle = views.get('res');
            ${config}
          }

          // model = null / Entity (for Variables); [] / [Entity] (for Collections)
          onHandleSync(handle, model, version) {
            this.addResult('sync', handle, version, this.toString(model));
          }

          // update = {data: Entity, added: [Entity], removed: [Entity]}
          onHandleUpdate(handle, update, version) {
            let details = '';
            if ('data' in update) {
              details += this.toString(update.data);
            }
            if ('added' in update) {
              details += '+' + this.toString(update.added);
            }
            if ('removed' in update) {
              details += '-' + this.toString(update.removed);
            }
            this.addResult('update', handle, version, details);
          }

          onHandleDesync(handle, version) {
            this.addResult('desync', handle, version, null);
          }

          toString(item) {
            if (item === null || item === undefined) {
              return '(' + item + ')';
            }
            if (Array.isArray(item)) {
              return '[' + item.map(v => v.value).join('|') + ']';
            }
            return item.value;
          }

          async addResult(method, handle, version, details) {
            let result = [handle.name, method, version, details].filter(x => x != null).join(':');
            await this._resHandle.store(new this._resHandle.entityClass({value: result}));
          }
        }
      });
    `
  });

  let Data = manifest.findSchemaByName('Data').entityClass();
  let fooStore = await arc.createHandle(Data.type, 'foo', 'test:0');
  let barStore = await arc.createHandle(Data.type.setViewOf(), 'bar', 'test:1');
  let resStore = await arc.createHandle(Data.type.setViewOf(), 'res', 'test:2');
  let inspector = new util.ResultInspector(arc, resStore, 'value');

  let recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(fooStore);
  recipe.handles[1].mapToStorage(barStore);
  recipe.handles[2].mapToStorage(resStore);
  recipe.normalize();
  return {arc, recipe, Data, fooStore, barStore, inspector};
}

// Calls set or store on a handle without triggering a change event.
async function writeWithoutFiring(handle, entity) {
  let fireFn = handle._fire;
  handle._fire = () => {};
  if (handle.set) {
    await handle.set(entity);
  } else {
    await handle.store(entity);
  }
  handle._fire = fireFn;
}

// TODO: multi-particle tests
// TODO: test with handles changing config options over time
describe('particle-api', function() {
  it('notifies for updates to initially empty handles', async function() {
    let {arc, recipe, Data, fooStore, barStore, inspector} = await setupProxySyncTests();

    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:0:(null)', 'bar:sync:0:[]');

    await fooStore.set(new Data({value: 'oh'}));
    await barStore.store({id: 'i1', rawData: {value: 'hai'}});
    await inspector.verify('foo:update:1:oh', 'bar:update:1:+[hai]');

    await fooStore.clear();
    await barStore.remove('i1');
    await inspector.verify('foo:update:2:(null)', 'bar:update:2:-[hai]');
  });

  it('notifies for updates to initially populated handles', async () => {
    let {arc, recipe, Data, fooStore, barStore, inspector} = await setupProxySyncTests();

    await fooStore.set(new Data({value: 'well'}));
    await barStore.store({id: 'i1', rawData: {value: 'hi'}});
    await barStore.store({id: 'i2', rawData: {value: 'there'}});
    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:1:well', 'bar:sync:2:[hi|there]');

    await fooStore.set(new Data({value: 'heeey'}));
    await barStore.store({id: 'i3', rawData: {value: 'buddy'}});
    await inspector.verify('foo:update:2:heeey', 'bar:update:3:+[buddy]');

    await fooStore.clear();
    await barStore.remove('i2');
    await inspector.verify('foo:update:3:(null)', 'bar:update:4:-[there]');
  });

  it('handles dropped updates on a Variable with immediate resync', async function() {
    let {arc, recipe, Data, fooStore, inspector} = await setupProxySyncTests(`
      views.get('foo').configure({notifyDesync: true});
    `);

    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:0:(null)', 'bar:sync:0:[]');

    // Drop event 2; desync is triggered by v3.
    await fooStore.set(new Data({value: 'v1'}));
    await writeWithoutFiring(fooStore, new Data({value: 'v2'}));
    await fooStore.set(new Data({value: 'v3'}));
    await inspector.verify('foo:update:1:v1', 'foo:desync:3', 'foo:sync:3:v3');
  });

  it('handles dropped updates on a Collection with immediate resync', async function() {
    let {arc, recipe, barStore, inspector} = await setupProxySyncTests(`
      views.get('bar').configure({notifyDesync: true});
    `);

    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:0:(null)', 'bar:sync:0:[]');

    // Drop event 2; desync is triggered by v3.
    await barStore.store({id: 'i1', rawData: {value: 'v1'}});
    await writeWithoutFiring(barStore, {id: 'i2', rawData: {value: 'v2'}});
    await barStore.store({id: 'i3', rawData: {value: 'v3'}});
    await inspector.verify('bar:update:1:+[v1]', 'bar:desync:3', 'bar:sync:3:[v1|v2|v3]');
  });

  it('handles dropped updates on a Collection with delayed resync', async function() {
    let {arc, recipe, barStore, inspector} = await setupProxySyncTests(`
      views.get('bar').configure({notifyDesync: true});
    `);

    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:0:(null)', 'bar:sync:0:[]');

    // Drop event 2.
    await barStore.store({id: 'i1', rawData: {value: 'v1'}});
    await writeWithoutFiring(barStore, {id: 'i2', rawData: {value: 'v2'}});

    // Delay the onSynchronizeProxy behaviour such that the sync request triggered by
    // the v3 update arrives when the storage object is at v5, and the subsequent response
    // to that only arrives at the proxy after the v6 and v7 updates have been sent:
    //   v1 (v2) v3 <desync> v4 v5 (get-data-for-resync) v6 v7 <resync-with-v5>
    let syncFn = arc.pec._apiPort.onSynchronizeProxy;
    let syncCallback;
    arc.pec._apiPort.onSynchronizeProxy = ({handle, callback}) => { syncCallback = callback; };
    await barStore.store({id: 'i3', rawData: {value: 'v3'}});
    await barStore.store({id: 'i4', rawData: {value: 'v4'}});
    await barStore.store({id: 'i5', rawData: {value: 'v5'}});
    let v5Data = await barStore.toListWithVersion();
    await barStore.store({id: 'i6', rawData: {value: 'v6'}});
    await barStore.remove('i1');
    barStore.toListWithVersion = () => v5Data;
    await syncFn({handle: barStore, callback: syncCallback});

    await inspector.verify('bar:update:1:+[v1]', 'bar:desync:3', 'bar:sync:5:[v1|v2|v3|v4|v5]',
                           'bar:update:6:+[v6]', 'bar:update:7:-[v1]');
  });

  it('handles misorded updates on a Collection', async function() {
    let {arc, recipe, barStore, inspector} = await setupProxySyncTests(`
      views.get('bar').configure({notifyDesync: true});
    `);

    await arc.instantiate(recipe);
    await inspector.verify('foo:sync:0:(null)', 'bar:sync:0:[]');

    // Reorder updates by fiddling with the stored version number.
    await barStore.store({id: 'i1', rawData: {value: 'v1'}});
    barStore._version = 2;
    await barStore.store({id: 'i3', rawData: {value: 'v3'}});
    barStore._version = 1;
    await barStore.store({id: 'i2', rawData: {value: 'v2'}});
    barStore._version = 3;
    await barStore.store({id: 'i4', rawData: {value: 'v4'}});

    // Desync is triggered, but the resync message is ignored because the updates
    // "catch up" before the resync arrives.
    await inspector.verify('bar:update:1:+[v1]', 'bar:desync:3', 'bar:update:2:+[v2]',
                           'bar:update:3:+[v3]', 'bar:update:4:+[v4]');
  });

  it('sends update notifications with non-synced handles', async function() {
    let {arc, recipe, Data, fooStore, barStore, inspector} = await setupProxySyncTests(`
      views.get('foo').configure({keepSynced: false, notifyUpdate: true});
      views.get('bar').configure({keepSynced: false, notifyUpdate: true});
    `);

    // Initial syncs are ignored.
    await arc.instantiate(recipe);
    await inspector.verify();

    // Updates are sent.
    await fooStore.set(new Data({value: 'v1'}));
    await barStore.store({id: 'i1', rawData: {value: 'v1'}});
    await inspector.verify('foo:update:1:v1', 'bar:update:1:+[v1]');

    // Desync events ignored, resync events are just updates.
    await writeWithoutFiring(fooStore, new Data({value: 'v2'}));
    await writeWithoutFiring(barStore, {id: 'i2', rawData: {value: 'v2'}});
    await fooStore.set(new Data({value: 'v3'}));
    await barStore.store({id: 'i3', rawData: {value: 'v3'}});
    await inspector.verify('foo:update:3:v3', 'bar:update:3:+[v3]');
  });

  it('contains view synchronize calls', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
      manifest: `
        schema Input
          Text value

        schema Result
          Text value

        particle P in 'a.js'
          in [Input] inputs
          out Result result

        recipe
          use 'test:1' as view0
          use 'test:2' as view1
          P
            inputs <- view0
            result -> view1
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              var input = views.get("inputs");
              var output = views.get("result");
              input.synchronize('change', model => {
                output.set(new output.entityClass({value: '' + model.length}));
              }, _update => undefined, this);
            }
          }
        });
      `
    });

    let Input = manifest.findSchemaByName('Input').entityClass();
    let inputView = await arc.createHandle(Input.type.setViewOf(), undefined, 'test:1');
    inputView.store({id: '1', rawData: {value: 'Hi'}});
    inputView.store({id: '2', rawData: {value: 'There'}});

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:2');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(inputView);
    recipe.handles[1].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, '2');
  });

  it('contains a constructInnerArc call', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use as view0
          P
            result -> view0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var resultHandle = views.get('result');
              let view = await arc.createHandle(resultHandle.type, "a view");
              view.set(new resultHandle.entityClass({value: 'success'}));
              resultHandle.set(new resultHandle.entityClass({value: 'done'}));
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, 'done');
    let newView = arc.findHandlesByType(Result.type)[1];
    assert(newView.name == 'a view');
    await util.assertSingletonIs(newView, Result, 'success');
  });

  it('can load a recipe', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use 'test:1' as view0
          P
            result -> view0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var resultHandle = views.get('result');
              let inView = await arc.createHandle(resultHandle.type, "in view");
              let outView = await arc.createHandle(resultHandle.type, "out view");
              try {
                await arc.loadRecipe(\`
                  schema Result
                    Text value

                  particle PassThrough in 'pass-through.js'
                    in Result a
                    out Result b

                  recipe
                    use '\${inView._id}' as v1
                    use '\${outView._id}' as v2
                    PassThrough
                      a <- v1
                      b -> v2

                \`);
                inView.set(new resultHandle.entityClass({value: 'success'}));
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
            setViews(views) {
              views.get('a').get().then(result => {
                views.get('b').set(result);
              });
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, 'done');
    let newView = arc.findHandlesByType(Result.type)[2];
    assert(newView.name == 'out view');
    await util.assertSingletonWillChangeTo(newView, Result, 'success');
  });

  it('can load a recipe referencing a manifest store', async () => {
    let {manifest, arc} = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          Text value

        particle P in 'a.js'
          out Result result

        recipe
          use 'test:1' as view0
          P
            result -> view0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var resultHandle = views.get('result');
              let inView = await arc.createHandle(resultHandle.type, "in view");
              let outView = await arc.createHandle(resultHandle.type, "out view");
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
                     use '\${inView._id}' as v1
                     use '\${outView._id}' as v2
                     PassThrough
                       nobId <- nobId
                       a <- v1
                       b -> v2

                \`);
                inView.set(new resultHandle.entityClass({value: 'success'}));
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
            setViews(views) {
              views.get('a').get().then(resultA => {
                views.get('nobId').get().then(resultNob => {
                  if (resultNob.nobId === '12345') {
                    views.get('b').set(resultA);
                  }
                })
              });
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, 'done');
    let newView = arc.findHandlesByType(Result.type)[2];
    assert(newView.name == 'out view');
    await util.assertSingletonWillChangeTo(newView, Result, 'success');
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
          use 'test:1' as view0
          create #target as target
          P
            result -> view0
            target <- target
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var resultHandle = views.get('result');
              let inView = await arc.createHandle(resultHandle.type, "in view");
              let outView = await arc.createHandle(resultHandle.type, "out view");
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
                     use '\${inView._id}' as v1
                     use '\${outView._id}' as v2
                     PassThrough
                       target <- target
                       a <- v1
                       b -> v2

                \`);
                inView.set(new resultHandle.entityClass({value: 'success'}));
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
            setViews(views) {
              views.get('a').get().then(resultA => {
                views.get('target').get().then(resultTarget => {
                  views.get('b').set(resultA);
                })
              });
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, 'done');
    let newView = arc.findHandlesByType(Result.type)[2];
    assert(newView.name == 'out view');
    await util.assertSingletonWillChangeTo(newView, Result, 'success');
  });

  // TODO(wkorman): The below test fails and is currently skipped as we're only
  // running basic recipe resolution, and `use` ends up in
  // `arc.findHandlesByType` which doesn't fall back to considering handles in
  // the arc's context as does, for example, `arc.findHandleById`. We could
  // potentially address either by including more strategies in the outer-PEC's
  // strategizer or adding such fallback to `arc.findHandlesByType`.
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
          use 'test:1' as view0
          P
            result -> view0
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var resultHandle = views.get('result');
              let inView = await arc.createHandle(resultHandle.type, "in view");
              let outView = await arc.createHandle(resultHandle.type, "out view");
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
                     use '\${inView._id}' as v1
                     use '\${outView._id}' as v2
                     PassThrough
                       target <- target
                       a <- v1
                       b -> v2

                \`);
                inView.set(new resultHandle.entityClass({value: 'success'}));
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
            setViews(views) {
              views.get('a').get().then(resultA => {
                views.get('target').get().then(resultNob => {
                  if (resultNob.nobId === '12345') {
                    views.get('b').set(resultA);
                  }
                })
              });
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultHandle = await arc.createHandle(Result.type, undefined, 'test:1');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(resultHandle);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultHandle, Result, 'done');
    let newView = arc.findHandlesByType(Result.type)[2];
    assert(newView.name == 'out view');
    await util.assertSingletonWillChangeTo(newView, Result, 'success');
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
          use 'test:1' as view0
          use 'test:2' as view1
          P
            inputs <- view0
            results = view1
      `,
      'a.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class P extends Particle {
            async setViews(views) {
              let arc = await this.constructInnerArc();
              var inputsView = views.get('inputs');
              var inputsList = await inputsView.toList();
              var resultsView = views.get('results');
              for (let input of inputsList) {
                let inView = await arc.createHandle(resultsView.type.primitiveType(), "in view");
                let outView = await arc.createHandle(resultsView.type.primitiveType(), "out view");
                try {
                  let done = await arc.loadRecipe(\`
                    schema Result
                      Text value

                    particle PassThrough in 'pass-through.js'
                      in Result a
                      out Result b

                    recipe
                      use '\${inView._id}' as v1
                      use '\${outView._id}' as v2
                      PassThrough
                        a <- v1
                        b -> v2

                  \`);
                  inView.set(input);
                  let res = resultsView.store(new resultsView.entityClass({value: 'done'}));

                  outView.on('change', () => {
                    outView.get().then(result => {
                      if (result) {
                        resultsView.store(result);
                      }
                    })
                  }, this);
                } catch (e) {
                  resultsView.store(new resultsView.entityClass({value: e}));
                }
              }
            }
          }
        });
      `,
      'pass-through.js': `
        "use strict";

        defineParticle(({Particle}) => {
          return class PassThrough extends Particle {
            setViews(views) {
              views.get('a').get().then(result => {
                var bView = views.get('b');
                bView.set(new bView.entityClass({value:result.value.toUpperCase()}));
              });
            }
          }
        });
      `
    });

    let Result = manifest.findSchemaByName('Result').entityClass();
    let inputsView = await arc.createHandle(Result.type.setViewOf(), undefined, 'test:1');
    inputsView.store({id: '1', rawData: {value: 'hello'}});
    inputsView.store({id: '2', rawData: {value: 'world'}});
    let resultsView = await arc.createHandle(Result.type.setViewOf(), undefined, 'test:2');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(inputsView);
    recipe.handles[1].mapToStorage(resultsView);
    recipe.normalize();
    await arc.instantiate(recipe);

    await util.assertViewWillChangeTo(resultsView, Result, 'value', ['done', 'done', 'HELLO', 'WORLD']);

    // TODO: how do i listen to inner arc's outView view-changes?
    // await util.assertViewWillChangeTo(resultsView, Result, "value", ["HELLO", "WORLD"]);
    let newView = arc.findHandlesByType(Result.type)[1];
    assert(newView.name == 'out view', `Unexpected newView name: ${newView.name}`);

    util.assertSingletonIs(newView, Result, 'HELLO');
    newView = arc.findHandlesByType(Result.type)[3];
    assert(newView.name == 'out view', `Unexpected newView name: ${newView.name}`);
    await util.assertSingletonIs(newView, Result, 'WORLD');
  });
});
