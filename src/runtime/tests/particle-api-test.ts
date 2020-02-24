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
import {Arc} from '../arc.js';
import {SlotComposer} from '../slot-composer.js';
import {Description} from '../description.js';
import {IdGenerator} from '../id.js';
import {Manifest} from '../manifest.js';
import {Schema} from '../schema.js';
import {EntityType, CollectionType} from '../type.js';
import {Entity} from '../entity.js';
import {Runtime} from '../runtime.js';
import {Speculator} from '../../planning/speculator.js';
import {BigCollectionStorageProvider} from '../storage/storage-provider-base.js';
import {collectionHandleForTest, singletonHandleForTest} from '../testing/handle-for-test.js';
import {Flags} from '../flags.js';
import {StorageProxy} from '../storageNG/storage-proxy.js';
import {unifiedHandleFor} from '../handle.js';
import {RamDiskStorageDriverProvider} from '../storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';

class ResultInspector {
  private readonly _arc: Arc;
  private readonly _store;
  private readonly _field;

  /**
   * @param arc the arc being tested; used to detect when all messages have been processed.
   * @param store a Collection-based store that should be connected as an output for the particle.
   * @param field the field within store's contained Entity type that this inspector should observe.
   */
  constructor(arc: Arc, store, field: string) {
    assert(store.type instanceof CollectionType, `ResultInspector given non-Collection store: ${store}`);
    this._arc = arc;
    this._store = store;
    this._field = field;
  }

  /**
   * Wait for the arc to be idle then verify that exactly the expected messages have been received.
   * This clears the contents of the observed store after each call, allowing repeated independent
   * checks in the same test. The order of expectations is not significant.
   */
  async verify(...expectations) {
    await this._arc.idle;
    let handle;
    if (Flags.useNewStorageStack) {
      const proxy = new StorageProxy('id', await this._store.activate(), this._store.type, this._store.storageKey.toString());
      handle = unifiedHandleFor({proxy, idGenerator: null, particleId: 'pid'});
    } else {
      handle = this._store;
    }
    let received = await handle.toList();
    const misses = [];
    if (!Flags.useNewStorageStack) {
      received = received.map(r => r.rawData);
    }
    for (const item of received.map(r => r[this._field])) {
      const i = expectations.indexOf(item);
      if (i >= 0) {
        expectations.splice(i, 1);
      } else {
        misses.push(item);
      }
    }
    if (Flags.useNewStorageStack) {
      await handle.clear();
    } else {
      this._store.clearItemsForTesting();
    }
    const errors: string[] = [];
    if (expectations.length) {
      errors.push(`Expected, not received: ${expectations.join(', ')}`);
    }
    if (misses.length) {
      errors.push(`Received, not expected: ${misses.join(', ')}`);
    }

    return new Promise((resolve, reject) => {
      if (errors.length === 0) {
        resolve();
      } else {
        reject(new Error(errors.join(' | ')));
      }
    });
  }
}

async function loadFilesIntoNewArc(fileMap: {[index:string]: string, manifest: string}): Promise<Arc> {
  const manifest = await Manifest.parse(fileMap.manifest);
  const runtime = new Runtime({loader: new Loader(null, fileMap), context: manifest});
  return runtime.newArc('demo');
}

describe('particle-api', () => {
  it('StorageProxy integration test', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          value: Text

        particle P in 'a.js'
          foo: reads Data
          res: writes [Data]

        recipe
          handle0: use 'test:0'
          handle1: use 'test:1'
          P
            foo: reads handle0
            res: writes handle1
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
              await this.resHandle.add(new this.resHandle.entityClass({value}));
            }
          }
        });
      `
    });

    const data = Entity.createEntityClass(arc.context.findSchemaByName('Data'), null);
    const fooStore = await arc.createStore(data.type, 'foo', 'test:0');
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    const resStore = await arc.createStore(data.type.collectionOf(), 'res', 'test:1');
    const inspector = new ResultInspector(arc, resStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(fooStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();

    await arc.instantiate(recipe);
    await inspector.verify('sync:null');

    // Drop event 2; desync is triggered by v3.
    await fooHandle.set(new fooHandle.entityClass({value: 'v1'}));
    let fireFn;
    const activeStore = await fooStore.activate();
    if (Flags.useNewStorageStack) {
      fireFn = activeStore['deliverCallbacks'];
      activeStore['deliverCallbacks'] = () => {};
    } else {
      fireFn = fooStore['_fire'];
      fooStore['_fire'] = async () => {};
    }
    await fooHandle.set(new fooHandle.entityClass({value: 'v2'}));
    if (Flags.useNewStorageStack) {
      activeStore['deliverCallbacks'] = (...args) => fireFn.bind(activeStore)(...args);
    } else {
      fooStore['_fire'] = fireFn;
    }
    await fooHandle.set(new fooHandle.entityClass({value: 'v3'}));
    if (Flags.useNewStorageStack) {
      await inspector.verify('update:{"originator":false,"data":{"value":"v1"}}',
                            'desync',
                            'sync:{"value":"v3"}');
    } else {
      await inspector.verify('update:{"data":{"value":"v1"}}',
                            'desync',
                            'sync:{"value":"v3"}');
    }

    // Check it includes the previous value (v3) in updates.
    await fooHandle.set(new fooHandle.entityClass({value: 'v4'}));
    if (Flags.useNewStorageStack) {
      await inspector.verify('update:{"originator":false,"data":{"value":"v4"}}');
    } else {
      await inspector.verify('update:{"data":{"value":"v4"}}');
    }

    // Check clearing the store.
    await fooHandle.clear();
    if (Flags.useNewStorageStack) {
      await inspector.verify('update:{"originator":false}');
    } else {
      await inspector.verify('update:{"data":null}');
    }
  });

  it('can sync/update and store/remove with collections', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        particle P in 'a.js'
          result: reads writes [Result]

        recipe
          handle0: use 'result-handle'
          P
            result: handle0
      `,
      'a.js': `
        defineParticle(({Particle}) => {
          return class P extends Particle {
            onHandleSync(handle, model) {
              let result = handle;
              result.add(new result.entityClass({value: 'one'}));
              result.add(new result.entityClass({value: 'two'}));
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

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type.collectionOf(), undefined, 'result-handle');
    const resultHandle = await collectionHandleForTest(arc, resultStore);
    const recipe = arc.context.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    const values = await resultHandle.toList();
    assert.deepStrictEqual(values, [{value: 'two'}]);
  });

  it('contains a constructInnerArc call', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        particle P in 'a.js'
          result: writes Result

        recipe
          handle0: use
          P
            result: writes handle0
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

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const resultHandle = await singletonHandleForTest(arc, resultStore);

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await resultHandle.fetch(), {value: 'done'});
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[0];
    assert.strictEqual(newStore.name, 'hello');

    const newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'success'});
  });

  it('can load a recipe', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        particle P in 'a.js'
          result: writes Result

        recipe
          handle0: use 'test:1'
          P
            result: writes handle0
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
                    value: Text

                  particle PassThrough in 'pass-through.js'
                    a: reads Result
                    b: writes Result

                  recipe
                    handle1: use '\${inHandle._id}'
                    handle2: use '\${outHandle._id}'
                    PassThrough
                      a: reads handle1
                      b: writes handle2

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
              handles.get('a').fetch().then(result => {
                handles.get('b').set(result);
              });
            }
          }
        });
      `
    });

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const resultHandle = await singletonHandleForTest(arc, resultStore);

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await resultHandle.fetch(), {value: 'done'});
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.strictEqual(newStore.name, 'the-out');

    const newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'success'});
  });
  // TODO(cypher1): Disabling this for now. The resolution seems to depend on order.
  // It is likely that this usage was depending on behavior that may not be intended.
  it.skip('can load a recipe referencing a manifest store', async () => {
    RamDiskStorageDriverProvider.register(new TestVolatileMemoryProvider());
    const nobType = Flags.useNewStorageStack ? '![NobIdStore {nobId: Text}]' : 'NobIdStore {nobId: Text}';
    const nobData = Flags.useNewStorageStack ? '{"root": {"values": {"nid": {"value": {"id": "nid", "rawData": {"nobId": "12345"}}, "version": {"u": 1}}}, "version": {"u": 1}}, "locations": {}}' : '[{"nobId": "12345"}]';

    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        particle P in 'a.js'
          result: writes Result

        recipe
          handle0: use 'test:1'
          P
            result: writes handle0
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
                    value: Text

                  store NobId of ${nobType} in NobIdJson
                   resource NobIdJson
                     start
                     ${nobData}

                   particle PassThrough in 'pass-through.js'
                     nobId: reads NobIdStore {nobId: Text}
                     a: reads Result
                     b: writes Result

                   recipe
                     nodId: use NobId
                     handle1: use '\${inHandle._id}'
                     handle2: use '\${outHandle._id}'
                     PassThrough
                       nobId: reads nobId
                       a: reads handle1
                       b: writes handle2

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
              handles.get('a').fetch().then(resultA => {
                handles.get('nobId').fetch().then(resultNob => {
                  if (resultNob && resultNob.nobId === '12345') {
                    handles.get('b').set(resultA);
                  }
                })
              });
            }
          }
        });
      `
    });

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const resultHandle = await singletonHandleForTest(arc, resultStore);

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await resultHandle.fetch(), {value: 'done'});
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.strictEqual(newStore.name, 'the-out');

    const newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'success'});
  });

  it('can load a recipe referencing a tagged handle in containing arc', async () => {
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        schema Foo
          bar: Text

        particle P in 'a.js'
          result: writes Result
          target: reads Foo

        recipe
          handle0: use 'test:1'
          target: create #target
          P
            result: writes handle0
            target: reads target
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
                     bar: Text

                   schema Result
                     value: Text

                   particle PassThrough in 'pass-through.js'
                     target: reads Foo
                     a: reads Result
                     b: writes Result

                   recipe
                     target: use #target
                     handle1: use '\${inHandle._id}'
                     handle2: use '\${outHandle._id}'
                     PassThrough
                       target: reads target
                       a: reads handle1
                       b: writes handle2

                \`);
                inHandle.set(new resultHandle.entityClass({value: 'success'}));
                resultHandle.set(new resultHandle.entityClass({value: 'done'}));
              } catch (e) {
                console.log(e);
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
              handles.get('a').fetch().then(resultA => {
                handles.get('target').fetch().then(resultTarget => {
                  handles.get('b').set(resultA);
                })
              });
            }
          }
        });
      `
    });

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const resultHandle = await singletonHandleForTest(arc, resultStore);

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await resultHandle.fetch(), {value: 'done'});
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.strictEqual(newStore.name, 'the-out');

    const newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'success'});
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
          value: Text

        store NobId of NobIdStore {nobId: Text} #target in NobIdJson
         resource NobIdJson
           start
           [{"nobId": "12345"}]

        particle P in 'a.js'
          result: writes Result

        recipe
          handle0: use 'test:1'
          P
            result: writes handle0
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
                     value: Text

                   particle PassThrough in 'pass-through.js'
                     target: reads NobIdStore {nobId: Text}
                     a: reads Result
                     b: writes Result

                   recipe
                     target: use #target
                     handle1: use '\${inHandle._id}'
                     handle2: use '\${outHandle._id}'
                     PassThrough
                       target: reads target
                       a: reads handle1
                       b: writes handle2

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
              handles.get('a').fetch().then(resultA => {
                handles.get('target').fetch().then(resultNob => {
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

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const resultStore = await arc.createStore(result.type, undefined, 'test:1');
    const resultHandle = await singletonHandleForTest(arc, resultStore);

    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(resultStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    assert.deepStrictEqual(await resultHandle.fetch(), {value: 'done'});
    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const newStore = innerArc.findStoresByType(result.type)[1];
    assert.strictEqual(newStore.name, 'the-out');

    const newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'success'});
  });

  it('multiplexing', async () => {
    const addFunc = Flags.useNewStorageStack ? 'add' : 'store';
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Result
          value: Text

        particle P in 'a.js'
          inputs: reads [Result]
          results: reads writes [Result]

        recipe
          handle0: use 'test:1'
          handle1: use 'test:2'
          P
            inputs: reads handle0
            results: handle1
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
                      value: Text

                    particle PassThrough in 'pass-through.js'
                      a: reads Result
                      b: writes Result

                    recipe
                      handle1: use '\${inHandle._id}'
                      handle2: use '\${outHandle._id}'
                      PassThrough
                        a: reads handle1
                        b: writes handle2
                  \`);
                  inHandle.set(input);
                  this.resHandle.${addFunc}(new this.resHandle.entityClass({value: 'done'}));
                } catch (e) {
                  this.resHandle.${addFunc}(new this.resHandle.entityClass({value: e}));
                }
              }
            }
            async onHandleUpdate(handle, update) {
              if (handle.name === 'the-out') {
                this.resHandle.${addFunc}(update.data);
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

    const result = Entity.createEntityClass(arc.context.findSchemaByName('Result'), null);
    const inputsStore = await arc.createStore(result.type.collectionOf(), undefined, 'test:1');
    const inputsHandle = await collectionHandleForTest(arc, inputsStore);
    await inputsHandle.add(new inputsHandle.entityClass({value: 'hello'}));
    await inputsHandle.add(new inputsHandle.entityClass({value: 'world'}));
    const resultsStore = await arc.createStore(result.type.collectionOf(), undefined, 'test:2');
    const resultsHandle = await collectionHandleForTest(arc, resultsStore);
    const inspector = new ResultInspector(arc, resultsStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(inputsStore);
    recipe.handles[1].mapToStorage(resultsStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.sameMembers((await resultsHandle.toList()).map(item => item.value), ['done', 'done', 'HELLO', 'WORLD']);
    await inspector.verify('done', 'done', 'HELLO', 'WORLD');

    const [innerArc] = arc.findInnerArcs(arc.activeRecipe.particles[0]);
    const innerArcStores = innerArc.findStoresByType(result.type);

    let newStore = innerArcStores[1];
    assert.strictEqual(innerArcStores[1].name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    let newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'HELLO'});

    newStore = innerArcStores[3];
    assert.strictEqual(newStore.name, 'the-out', `Unexpected newStore name: ${newStore.name}`);
    newHandle = await singletonHandleForTest(arc, newStore);
    assert.deepStrictEqual(await newHandle.fetch(), {value: 'WORLD'});
  });

  it('big collection store and remove', async function() {
    // Big collection is not supported in new storage stack.
    if (Flags.useNewStorageStack) {
      this.skip();
    }
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          value: Text

        particle P in 'a.js'
          big: reads writes BigCollection<Data>

        recipe
          handle0: use 'test:0'
          P
            big: handle0
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

    const dataClass = Entity.createEntityClass(arc.context.findSchemaByName('Data'), null);
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), 'big', 'test:0') as BigCollectionStorageProvider;
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(bigStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    const cursorId = await bigStore.stream(5);
    const data = await bigStore.cursorNext(cursorId);
    assert.deepStrictEqual(data.value.map(item => item.rawData.value), ['finn', 'jake']);
  });

  it('big collection streamed reads', async function() {
    // Big collection is not supported in new storage stack.
    if (Flags.useNewStorageStack) {
      this.skip();
    }
    const arc = await loadFilesIntoNewArc({
      manifest: `
        schema Data
          value: Text

        particle P in 'a.js'
          big: reads BigCollection<Data>
          res: writes [Data]

        recipe
          handle0: use 'test:0'
          handle1: use 'test:1'
          P
            big: reads handle0
            res: writes handle1
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
                this.addResult(value.map(item => item.value).join(','));
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

    const dataClass = Entity.createEntityClass(arc.context.findSchemaByName('Data'), null);
    const bigStore = await arc.createStore(dataClass.type.bigCollectionOf(), 'big', 'test:0') as BigCollectionStorageProvider;
    const promises: Promise<void>[] = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(bigStore.store({id: 'i' + i, rawData: {value: 'v' + i}}, ['k' + i]));
    }
    await Promise.all(promises);

    const resStore = await arc.createStore(dataClass.type.collectionOf(), 'res', 'test:1');
    const inspector = new ResultInspector(arc, resStore, 'value');
    const recipe = arc.context.recipes[0];
    recipe.handles[0].mapToStorage(bigStore);
    recipe.handles[1].mapToStorage(resStore);
    recipe.normalize();
    await arc.instantiate(recipe);
    await inspector.verify('v1,v2,v3', 'v4,v5', 'done');
  });

  it('particles can indicate that they are busy in setHandles', async () => {
    const loader = new Loader(null, {
      './manifest': `
        particle CallsBusy in 'callsBusy.js'
          bar: reads * {}
          far: writes * {result: Text}

        recipe
          foo: use 'test:0'
          faz: use 'test:1'
          CallsBusy
            bar: reads foo
            far: writes faz
      `,
      './callsBusy.js': `
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
    const context = new Manifest({id});
    const arc = new Arc({id, loader, context});
    const manifest = await Manifest.load('./manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();

    await arc.instantiate(recipe);

    const inHandle = await singletonHandleForTest(arc, inStore);
    const entityType = Entity.createEntityClass(inStore.type.getEntitySchema(), null);
    const entity = new entityType({}, '1');
    await inHandle.set(entity);

    await arc.idle;
    const outHandle = await singletonHandleForTest(arc, outStore);
    assert.deepStrictEqual(await outHandle.fetch(), {result: 'hi'});
  });

  it('particles can indicate that they are busy in onHandleSync', async () => {
    const loader = new Loader(null, {
      './manifest': `
        particle CallsBusy in 'callsBusy.js'
          bar: reads * {}
          far: writes * {result: Text}

        recipe
          foo: use 'test:0'
          faz: use 'test:1'
          CallsBusy
            bar: reads foo
            far: writes faz
      `,
      './callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.out = handles.get('far');
            }
            async onHandleSync(handle, model) {
              await handle.fetch();
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
    const context = new Manifest({id});
    const arc = new Arc({id, loader, context});
    const manifest = await Manifest.load('./manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();

    await arc.instantiate(recipe);

    const inHandle = await singletonHandleForTest(arc, inStore);
    const entityType = Entity.createEntityClass(inStore.type.getEntitySchema(), null);
    const entity = new entityType({}, '1');
    await inHandle.set(entity);

    await arc.idle;
    const outHandle = await singletonHandleForTest(arc, outStore);
    assert.deepStrictEqual(await outHandle.fetch(), {result: 'hi'});
  });

  it('particles can indicate that they are busy in onHandleUpdate', async () => {
    const loader = new Loader(null, {
      './manifest': `
        particle CallsBusy in 'callsBusy.js'
          bar: reads * {}
          far: writes * {result: Text}

        recipe
          foo: use 'test:0'
          faz: use 'test:1'
          CallsBusy
            bar: reads foo
            far: writes faz
      `,
      './callsBusy.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.out = handles.get('far');
            }
            async onHandleUpdate(handle, update) {
              await handle.fetch();
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
    const context = new Manifest({id});
    const arc = new Arc({id, loader, context});
    const manifest = await Manifest.load('./manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'foo', 'test:1');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'faz', 'test:2');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();

    await arc.instantiate(recipe);

    await arc.idle;
    const inHandle = await singletonHandleForTest(arc, inStore);
    await inHandle.set(new inHandle.entityClass({}));
    await arc.idle;
    const outHandle = await singletonHandleForTest(arc, outStore);
    assert.deepStrictEqual(await outHandle.fetch(), {result: 'hi'});
  });

  it('particles call startBusy in setHandles and set values in descriptions', async () => {
    const loader = new Loader(null, {
      './manifest': `
        particle CallsBusy in 'callsBusy.js'
          bar: reads * {}
          far: writes * {result: Text}
          description \`out is \${far.result}!\`
        recipe
          h0: use 'test:0'
          h1: use 'test:1'
          CallsBusy
            bar: reads h0
            far: writes h1
      `,
      './callsBusy.js': `
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
    const context = new Manifest({id});
    const arc = new Arc({id, loader, context});
    const manifest = await Manifest.load('./manifest', loader);
    const recipe = manifest.recipes[0];

    const inStore = await arc.createStore(new EntityType(new Schema([], {})), 'h0', 'test:0');
    const outStore = await arc.createStore(new EntityType(new Schema([], {result: 'Text'})), 'h1', 'test:1');
    recipe.handles[0].mapToStorage(inStore);
    recipe.handles[1].mapToStorage(outStore);
    recipe.normalize();

    const {speculativeArc, relevance} = await (new Speculator()).speculate(arc, recipe, 'recipe-hash');
    const description = await Description.create(speculativeArc, relevance);
    assert.strictEqual(description.getRecipeSuggestion(), 'Out is hi!');
  });

   it('particles call startBusy in setHandles with no value and set values in descriptions', async () => {
    const loader = new Loader(null, {
      './manifest': `
        particle SetBar in 'setBar.js'
          bar: writes * {}
        particle CallsBusy in 'callsBusy.js'
          bar: reads * {}
          far: writes * {result: Text}
          description \`out is \${far.result}!\`
        recipe
          h0: create *
          h1: create *
          SetBar
            bar: writes h0
          CallsBusy
            bar: reads h0
            far: writes h1
      `,
      './setBar.js': `
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.bar = handles.get('bar');
              this.bar.set(new this.bar.entityClass({}));
            }
          }
        });
      `,
      './callsBusy.js': `
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
    const context = new Manifest({id});
    const arc = new Arc({id, loader, context});
    const manifest = await Manifest.load('./manifest', loader);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());

     const {speculativeArc, relevance} = await (new Speculator()).speculate(arc, recipe, 'recipe-hash');
    const description = await Description.create(speculativeArc, relevance);
    assert.strictEqual(description.getRecipeSuggestion(), 'Out is hi!');
  });

  it('loadRecipe returns ids of provided slots', async () => {
    const context = await Manifest.parse(`
      particle TransformationParticle in 'TransformationParticle.js'
        root: consumes Slot

      recipe
        slot0: slot 'rootslotid-root'
        TransformationParticle
          root: consumes slot0`);

    const loader = new Loader(null, {
      'TransformationParticle.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            const {providedSlotIds} = await innerArc.loadRecipe(\`
              particle A in 'A.js'
                content: consumes Slot
                  detail: provides? Slot

              recipe
                hosted: slot '\` + hostedSlotId + \`'
                A as a
                  content: consumes hosted
            \`);

            await innerArc.loadRecipe(\`
              particle B in 'B.js'
                detail: consumes Slot

              recipe
                detail: slot '\` + providedSlotIds['a.detail'] + \`'
                B
                  detail: consumes detail
            \`);
          }

          renderHostedSlot(slotName, hostedSlotId, content) {}
        };
      });`,
      '*': `defineParticle(({UiParticle}) => class extends UiParticle {});`,
    });
    const slotComposer = new SlotComposer();
    const arc = new Arc({id: IdGenerator.newSession().newArcId('demo'),
        loader, slotComposer, context});
    const [recipe] = arc.context.recipes;
    recipe.normalize();

    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc.activeRecipe.particles, 1);
    const [transformationParticle] = arc.activeRecipe.particles;

    assert.lengthOf(arc.recipeDeltas, 1);
    const [innerArc] = arc.findInnerArcs(transformationParticle);

    const sessionId = innerArc.idGeneratorForTesting.currentSessionIdForTesting;
    // TODO(sjmiles): host slot id generation has changed
    assert.strictEqual(innerArc.activeRecipe.toString(), `recipe
  slot0: slot 'rootslotid-root___!${sessionId}:demo:inner2:slot1'
  slot1: slot '!${sessionId}:demo:inner2:slot2'
  A as particle0
    content: consumes slot0
      detail: provides slot1
  B as particle1
    detail: consumes slot1`,
    'Particle B should consume the detail slot provided by particle A');
  });
  // TODO(jopra): Fix the slandle version of this, which throws an undefined in setHandles.
  it.skip('loadRecipe returns ids of provided slots', async () => {
    const context = await Manifest.parse(`
      particle TransformationParticle in 'TransformationParticle.js'
        root: consumes Slot

      recipe
        slot0: slot 'rootslotid-root'
        TransformationParticle
          root: consumes slot0`);

    const loader = new Loader(null, {
      'TransformationParticle.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            const {providedSlotIds} = await innerArc.loadRecipe(\`
              particle A in 'A.js'
                content: consumes Slot
                  detail: provides? Slot

              recipe
                hosted: slot '\` + hostedSlotId + \`'
                A as a
                  content: consumes hosted
            \`);

            await innerArc.loadRecipe(\`
              particle B in 'B.js'
                detail: consumes Slot

              recipe
                detail: slot '\` + providedSlotIds['a.detail'] + \`'
                B
                  detail: consumes detail
            \`);
          }

          renderHostedSlot(slotName, hostedSlotId, content) {}
        };
      });`,
      '*': `defineParticle(({UiParticle}) => class extends UiParticle {});`,
    });
    // TODO(lindner): add strict rendering
    const slotComposer = new SlotComposer();
    const arc = new Arc({id: IdGenerator.newSession().newArcId('demo'), loader, slotComposer, context});
    const [recipe] = arc.context.recipes;
    recipe.normalize();

    await arc.instantiate(recipe);
    await arc.idle;

    assert.lengthOf(arc.activeRecipe.particles, 1);
    const [transformationParticle] = arc.activeRecipe.particles;

    assert.lengthOf(arc.recipeDeltas, 1);
    const [innerArc] = arc.findInnerArcs(transformationParticle);

    const sessionId = innerArc.idGeneratorForTesting.currentSessionIdForTesting;
    assert.strictEqual(innerArc.activeRecipe.toString(), `recipe
  slot0: slot '!${sessionId}:demo:inner2:slot1'
  slot1: slot '!${sessionId}:demo:inner2:slot2'
  A as particle0
    content: consumes slot0
      detail: provides slot1
  B as particle1
    detail: consumes slot1`,
    'Particle B should consume the detail slot provided by particle A');
  });
});
