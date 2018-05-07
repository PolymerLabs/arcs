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

class ResultInspector {
  constructor(arc, setView, field) {
    this._arc = arc;
    this._handle = setView;
    this._field = field;
  }

  async verify(...expectations) {
    await this._arc.idle;
    let received = await this._handle.toList();
    let misses = [];
    for (let item of received.map(r => r.rawData[this._field])) {
      let i = expectations.indexOf(item);
      if (i >= 0) {
        expectations.splice(i, 1);
      } else {
        misses.push(item);
      }
    }
    this._handle.clearItemsForTesting();

    let errors = [];
    if (expectations.length) {
      errors.push(`Expected, not received: ${expectations.join(' ')}`);
    }
    if (misses.length) {
      errors.push(`Received, not expected: ${misses.join(' ')}`);
    }

    return new Promise((resolve, reject) => {
      if (errors.length == 0) {
        resolve();
      } else {
        reject(new Error(errors.join(' | ')));
      }
    });
  }
}

async function setupProxySyncTests() {
  let {manifest, arc} = await loadFilesIntoNewArc({
    manifest: `
      schema Data
        Text value
      schema Result
        Text value

      particle P in 'a.js'
        P(in Data foo, inout [Data] bar, out [Result] res)

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
          }

          onHandleUpdate(handle, version, update) {
            let res = \`\${handle.name}:\${version}:\`;
            if ('variable' in update) {
              res += (update.variable !== null) ? update.variable.value : '(null)';
            }
            if ('collection' in update) {
              res += '[' + update.collection.map(v => v.rawData.value).join('|') + ']';
            }
            if ('added' in update) {
              res += update.added.map(id => '+' + id);
            }
            if ('removed' in update) {
              res += update.removed.map(id => '-' + id);
            }
            this.addResult(res);
          }

          onHandleDesync(handle, version) {
            this.addResult(\`\${handle.name}:\${version}:<desync>\`);
            handle.resync();
          }

          async addResult(msg) {
            await this._resHandle.store(new this._resHandle.entityClass({value: msg}));
          }
        }
      });
    `
  });

  let Data = manifest.findSchemaByName('Data').entityClass();
  let Result = manifest.findSchemaByName('Result').entityClass();
  let fooHandle = await arc.createHandle(Data.type, 'foo', 'test:0');
  let barHandle = await arc.createHandle(Data.type.setViewOf(), 'bar', 'test:1');
  let resHandle = await arc.createHandle(Result.type.setViewOf(), 'res', 'test:2');
  let inspector = new ResultInspector(arc, resHandle, 'value');

  let recipe = manifest.recipes[0];
  recipe.handles[0].mapToStorage(fooHandle);
  recipe.handles[1].mapToStorage(barHandle);
  recipe.handles[2].mapToStorage(resHandle);
  recipe.normalize();
  return {arc, recipe, Data, fooHandle, barHandle, inspector};
}

describe('particle-api', function() {
  it('notifies on updates for initially empty handles', async function() {
    let {arc, recipe, Data, fooHandle, barHandle, inspector} = await setupProxySyncTests();

    await arc.instantiate(recipe);
    await inspector.verify('foo:0:(null)', 'bar:0:[]');

    await fooHandle.set(new Data({value: 'oh'}));
    await barHandle.store({id: 'i1', rawData: {value: 'hai'}});
    await inspector.verify('foo:1:oh', 'bar:1:[hai]+i1');
  });

  it('notifies on updates for initially populated handles', async () => {
    let {arc, recipe, Data, fooHandle, barHandle, inspector} = await setupProxySyncTests();

    await fooHandle.set(new Data({value: 'well'}));
    await barHandle.store({id: 'i1', rawData: {value: 'hi'}});
    await barHandle.store({id: 'i2', rawData: {value: 'there'}});
    await arc.instantiate(recipe);
    await inspector.verify('foo:1:well', 'bar:2:[hi|there]');

    await fooHandle.set(new Data({value: 'heeey'}));
    await barHandle.store({id: 'i3', rawData: {value: 'buddy'}});
    await inspector.verify('foo:2:heeey', 'bar:3:[hi|there|buddy]+i3');
  });

  it('notifies for Variables being cleared', async () => {
    let {arc, recipe, Data, fooHandle, inspector} = await setupProxySyncTests();

    await fooHandle.set(new Data({value: 'well'}));
    await arc.instantiate(recipe);
    await inspector.verify('foo:1:well', 'bar:0:[]');

    await fooHandle.clear();
    await inspector.verify('foo:2:(null)');
  });

  it('notifies for items being removed from Collections', async () => {
    let {arc, recipe, barHandle, inspector} = await setupProxySyncTests();

    await barHandle.store({id: 'i1', rawData: {value: 'its'}});
    await barHandle.store({id: 'i2', rawData: {value: 'ame'}});
    await barHandle.store({id: 'i3', rawData: {value: 'mario'}});
    await arc.instantiate(recipe);
    await inspector.verify('foo:0:(null)', 'bar:3:[its|ame|mario]');

    await barHandle.remove('i1');
    await barHandle.remove('i2');
    await barHandle.remove('i3');
    await inspector.verify('bar:4:[ame|mario]-i1', 'bar:5:[mario]-i2', 'bar:6:[]-i3');
  });

  it('notifies on Collection desyncronized', async function() {
    let {arc, recipe, Data, fooHandle, barHandle, inspector} = await setupProxySyncTests();

    await barHandle.store({id: 'i1', rawData: {value: 'thelma'}});
    await arc.instantiate(recipe);
    await inspector.verify('foo:0:(null)', 'bar:1:[thelma]');

    // Fake a message being missed.
    barHandle.assignVersionForTesting(2);
    await barHandle.store({id: 'i3', rawData: {value: 'louise'}});
    // Test particle auto-resyncs, so we should see a second update with the full set.
    await inspector.verify('bar:3:<desync>', 'bar:3:[thelma|louise]');
  });

  it('ignores updates for current and previous versions', async () => {
    let {arc, recipe, Data, fooHandle, barHandle, inspector} = await setupProxySyncTests();

    fooHandle.assignVersionForTesting(3);
    barHandle.assignVersionForTesting(3);
    await fooHandle.set(new Data({value: 'batman'}));
    await barHandle.store({id: 'i4', rawData: {value: 'robin'}});
    await arc.instantiate(recipe);
    await inspector.verify('foo:4:batman', 'bar:4:[robin]');

    // Updates with previous version should be ignored.
    fooHandle.assignVersionForTesting(2);
    barHandle.assignVersionForTesting(2);
    await fooHandle.set(new Data({value: 'gnatman'}));
    await barHandle.store({id: 'i3', rawData: {value: 'bobbin'}});
    await inspector.verify();

    // Updates with same version should be ignored.
    await fooHandle.set(new Data({value: 'ratman'}));
    await barHandle.store({id: 'i4', rawData: {value: 'sobbin'}});
    await inspector.verify();

    // Updates with a new version should not be ignored.
    await fooHandle.set(new Data({value: 'statman'}));
    await barHandle.store({id: 'i5', rawData: {value: 'globbin'}});
    await inspector.verify('foo:5:statman', 'bar:5:[robin|globbin]+i5');
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
