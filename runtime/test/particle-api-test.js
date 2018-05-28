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
          use 'test:0' as view0
          use 'test:1' as view1
          P
            foo <- view0
            res -> view1
      `,
      'a.js': `
        'use strict';

        defineParticle(({Particle}) => {
          return class P extends Particle {
            setViews(views) {
              views.get('foo').configure({notifyDesync: true});
              this.resHandle = views.get('res');
            }

            onHandleSync(handle, model, version) {
              this.addResult('sync:' + version + ':' + JSON.stringify(model));
            }

            onHandleUpdate(handle, update, version) {
              this.addResult('update:' + version + ':' + JSON.stringify(update));
            }

            onHandleDesync(handle, version) {
              this.addResult('desync:' + version);
            }

            async addResult(value) {
              await this.resHandle.store(new this.resHandle.entityClass({value}));
            }
          }
        });
      `
    });

    let Data = manifest.findSchemaByName('Data').entityClass();
    let fooStore = await arc.createHandle(Data.type, 'foo', 'test:0');
    let resStore = await arc.createHandle(Data.type.setViewOf(), 'res', 'test:1');
    let inspector = new util.ResultInspector(arc, resStore, 'value');
    let recipe = manifest.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();

    await arc.instantiate(recipe);
    await inspector.verify('sync:0:null');

    // Drop event 2; desync is triggered by v3.
    await fooStore.set(new Data({value: 'v1'}));
    let fireFn = fooStore._fire;
    fooStore._fire = () => {};
    await fooStore.set(new Data({value: 'v2'}));
    fooStore._fire = fireFn;
    await fooStore.set(new Data({value: 'v3'}));
    await inspector.verify('update:1:{"data":{"rawData":{"value":"v1"}}}',
                           'desync:3',
                           'sync:3:{"rawData":{"value":"v3"}}');

    await fooStore.clear();
    await inspector.verify('update:4:{"data":null}');
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
