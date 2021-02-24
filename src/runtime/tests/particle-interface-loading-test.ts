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
import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../../platform/loader.js';
import {EntityType, InterfaceType, SingletonType} from '../../types/lib-types.js';
import {ParticleSpec} from '../arcs-types/particle-spec.js';
import {ArcId} from '../id.js';
import {VolatileStorageKey} from '../storage/drivers/volatile.js';
import {Entity} from '../entity.js';
import {handleForStoreInfo} from '../storage/storage.js';
import {newRecipe} from '../recipe/lib-recipe.js';
import {Runtime} from '../runtime.js';
import {StoreInfo} from '../storage/store-info.js';

async function mapHandleToStore(arc: Arc, recipe, classType: {type: EntityType}, id) {
  const store = await arc.createStore(new SingletonType(classType.type), undefined, `test:${id}`);
  const handle = await handleForStoreInfo(store, arc);
  recipe.handles[id].mapToStorage(store);
  return handle;
}

describe('particle interface loading', () => {

  it('loads interfaces into particles', async () => {
    const loader = new Loader(null, {
      'outer-particle.js': `
          'use strict';

          defineParticle(({Particle}) => {
            return class P extends Particle {
              async setHandles(handles) {
                this.arc = await this.constructInnerArc();
                this.outputHandle = handles.get('output');
                this.inHandle = await this.arc.createHandle(handles.get('input').type, 'input');
                this.outHandle = await this.arc.createHandle(this.outputHandle.type, 'output', this);
              }
              async onHandleSync(handle, model) {
                if (handle.name === 'input') {
                  this.inHandle.set(model);
                }
                if (handle.name === 'particle0') {
                  await this.arc.loadRecipe(Particle.buildManifest\`
                    \${model}

                    recipe
                      handle1: use \${this.inHandle}
                      handle2: use \${this.outHandle}
                      \${model.name}
                        foo: reads handle1
                        bar: writes handle2
                  \`);
                }
              }
              async onHandleUpdate(handle, update) {
                if (handle.name === 'output') {
                  this.outputHandle.set(update.data);
                }
              }
            };
          });`
    });
    const runtime = new Runtime({loader});
    const manifest = await runtime.parseFile('./src/runtime/tests/artifacts/test-particles.manifest');
    const {driverFactory, storageService, storageKeyParser} = runtime;
    const arc = new Arc({id: ArcId.newForTest('test'), loader, context: manifest, storageService, driverFactory, storageKeyParser});
    const fooType = new EntityType(manifest.schemas.Foo);
    const barType = new EntityType(manifest.schemas.Bar);

    const ifaceType = InterfaceType.make('Test', [{type: fooType}, {type: barType}], []);

    const outerParticleSpec = new ParticleSpec({
      name: 'outerParticle',
      external: false,
      implBlobUrl: '',
      modality: ['dom'],
      slotConnections: [],
      verbs: [],
      implFile: 'outer-particle.js',
      args: [
        {direction: 'hosts', relaxed: false, type: ifaceType.toLiteral(), name: 'particle0', dependentConnections: [], isOptional: false, annotations: []},
        {direction: 'reads', relaxed: false, type: fooType.toLiteral(), name: 'input', dependentConnections: [], isOptional: false, annotations: []},
        {direction: 'writes', relaxed: false, type: barType.toLiteral(), name: 'output', dependentConnections: [], isOptional: false, annotations: []}
      ],
    });

    const ifaceStore = await arc.createStore(new SingletonType(ifaceType));
    const outStore = await arc.createStore(new SingletonType(barType));
    const inStore = await arc.createStore(new SingletonType(fooType));
    const ifaceHandle = await handleForStoreInfo(ifaceStore, arc);
    await ifaceHandle.set(manifest.particles[0]);
    const inHandle = await handleForStoreInfo(inStore, arc);
    await inHandle.set(new inHandle.entityClass({value: 'a foo'}));

    const recipe = newRecipe();
    const particle = recipe.newParticle('outerParticle');
    particle.spec = outerParticleSpec;

    const recipeInterfaceHandle = recipe.newHandle();
    particle.addConnectionName('particle0').connectToHandle(recipeInterfaceHandle);
    recipeInterfaceHandle.fate = 'use';
    recipeInterfaceHandle.mapToStorage(ifaceStore);

    const recipeOutHandle = recipe.newHandle();
    particle.addConnectionName('output').connectToHandle(recipeOutHandle);
    recipeOutHandle.fate = 'use';
    recipeOutHandle.mapToStorage(outStore);

    const recipeInHandle = recipe.newHandle();
    particle.addConnectionName('input').connectToHandle(recipeInHandle);
    recipeInHandle.fate = 'use';
    recipeInHandle.mapToStorage(inStore);

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);
    await arc.idle;
    const outHandle = await handleForStoreInfo(outStore, arc);
    assert.deepStrictEqual(await outHandle.fetch() as {}, {value: 'a foo1'});
  });

  it('loads interfaces into particles declaratively', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import './src/runtime/tests/artifacts/test-particles.manifest'

      recipe
        h0: create *
        h1: create *
        OuterParticle
          particle0: reads TestParticle
          output: writes h0
          input: reads h1
      `, {loader, fileName: './test.manifest'});

    const runtime = new Runtime({context: manifest, loader});

    const fooType = manifest.findTypeByName('Foo') as EntityType;
    const barType = manifest.findTypeByName('Bar') as EntityType;

    const arc = await runtime.startArc({arcName: 'test'});

    const fooStore = arc.findStoresByType(new SingletonType(fooType))[0];
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    await fooHandle.setFromData({value: 'a foo'});

    await arc.idle;

    const barStore = arc.findStoresByType(new SingletonType(barType))[0];
    const barHandle = await handleForStoreInfo(barStore, arc);
    assert.deepEqual(await barHandle.fetch() as {}, {value: 'a foo1'});
  });

  it('updates transformation particle on inner handle', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        value: Text
      particle UpdatingParticle in 'updating-particle.js'
        innerFoo: writes Foo
      interface TestInterface
        writes Foo
      particle MonitoringParticle in 'monitoring-particle.js'
        hostedParticle: hosts TestInterface
        foo: writes Foo
      recipe
        h0: use *
        MonitoringParticle
          foo: h0
          hostedParticle: UpdatingParticle
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const loader = new Loader(null, {
      'monitoring-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          return class extends Particle {
            async setHandles(handles) {
              this.arc = await this.constructInnerArc();
              this.fooHandle = handles.get('foo');
              this.innerFooHandle = await this.arc.createHandle(this.fooHandle.type, 'innerFoo', this);
            }
            async onHandleSync(handle, model) {
              if (handle.name === 'hostedParticle') {
                await this.arc.loadRecipe(Particle.buildManifest\`
                  \${model}
                  recipe
                    h0: use \${this.innerFooHandle}
                    \${model.name}
                      innerFoo: h0
                \`);
              }
            }
            onHandleUpdate(handle, update) {
              if (handle.name === 'innerFoo') {
                this.fooHandle.set(new this.fooHandle.entityClass({value: \`\${update.data.value}!!!\`}));
              }
            }
          };
        });
      `,
      'updating-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          return class extends Particle {
            setHandles(handles) {
              this.innerFooHandle = handles.get('innerFoo');
              this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: 'hello world'}));
            }
          };
        });
      `
    });
    const runtime = new Runtime({context: manifest, loader});
    const arc = runtime.newArc({arcName: 'test'});
    const fooType = manifest.findTypeByName('Foo') as EntityType;
    const fooStore = await arc.createStore(new SingletonType(fooType));
    recipe.handles[0].mapToStorage(fooStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    assert.deepStrictEqual(await fooHandle.fetch() as {}, {value: 'hello world!!!'});
  });

  it('onFirstStart only runs for initialization and not reinstantiation', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        value: Text
      particle UpdatingParticle in 'updating-particle.js'
        innerFoo: reads writes Foo
      recipe
        h0: use *
        UpdatingParticle
          innerFoo: h0
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const loader = new Loader(null, {
      'updating-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          var created = false;
          return class extends Particle {
            onFirstStart() {
              this.innerFooHandle = this.handles.get('innerFoo');
              this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
              created = true;
            }
            async onHandleSync(handle, model) {
              if (!created) {
                this.innerFooHandle = this.handles.get('innerFoo');
                await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Not created!"}));
              }
            }
          };
        });
      `
    });
    const runtime = new Runtime({context: manifest, loader});
    const arc = runtime.newArc({arcName: 'test'});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:0');
    const fooHandle = await handleForStoreInfo(fooStore, arc);
    recipe.handles[0].mapToStorage(fooStore);

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await fooHandle.fetch(), new fooClass({value: 'Created!'}));

    const serialization = await arc.serialize();
    arc.dispose();

    const {driverFactory, storageService, storageKeyParser} = runtime;
    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest, storageService, driverFactory, storageKeyParser});
    await arc2.idle;

    const fooHandle2 = await handleForStoreInfo(arc2.stores.find(StoreInfo.isSingletonEntityStore), arc2);
    assert.deepStrictEqual(await fooHandle2.fetch(), new fooClass({value: 'Not created!'}));
  });

  it('onReady sees overriden values in onFirstStart', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        value: Text

      particle UpdatingParticle in 'updating-particle.js'
        bar: reads writes Foo
      recipe
        h1: use *
        UpdatingParticle
          bar: h1
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const loader = new Loader(null, {
      'updating-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          var handlesSynced = 0;
          return class extends Particle {
            onFirstStart() {
              this.barHandle = this.handles.get('bar');
              this.barHandle.set(new this.barHandle.entityClass({value: "Created!"}));
            }

            async onReady() {
              this.barHandle = this.handles.get('bar');
              this.bar = await this.barHandle.fetch();

              if(this.bar.value == "Created!") {
                await this.barHandle.set(new this.barHandle.entityClass({value: "Ready!"}))
              } else {
                await this.barHandle.set(new this.barHandle.entityClass({value: "Handle not overriden by onFirstStart!"}))
              }
            }
          };
        });
      `
    });
    const runtime = new Runtime({context: manifest, loader});
    const arc = runtime.newArc({arcName: 'test'});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const barHandle = await mapHandleToStore(arc, recipe, fooClass, 0);
    await barHandle.set(new fooClass({value: 'Set!'}));

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await barHandle.fetch(), new fooClass({value: 'Ready!'}));
  });

  it('onReady runs when handles are first synced', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        value: Text

      particle UpdatingParticle in 'updating-particle.js'
        innerFoo: reads writes Foo
        bar: reads Foo
      recipe
        h0: use *
        h1: use *
        UpdatingParticle
          innerFoo: h0
          bar: h1
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const loader = new Loader(null, {
      'updating-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          var handlesSynced = 0;
          return class extends Particle {
            onFirstStart() {
              this.innerFooHandle = this.handles.get('innerFoo');
              this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
            }
            onHandleSync(handle, model) {
              handlesSynced += 1;
            }
            async onReady() {
              this.innerFooHandle = this.handles.get('innerFoo');
              this.foo = await this.innerFooHandle.fetch()

              this.barHandle = this.handles.get('bar');
              this.bar = await this.barHandle.fetch();

              var s = "Ready!";
              if(this.foo.value != "Created!") {
                s = s + " onFirstStart was not called before onReady.";
              }
              if (this.bar.value != "Set!") {
                s = s + " Read only handles not initialised in onReady";
              }
              if (handlesSynced != 2) {
                s = s + " Not all handles were synced before onReady was called.";
              }

              this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: s}))
            }
          };
        });
      `
    });
    const runtime = new Runtime({context: manifest, loader});
    const arc = runtime.newArc({arcName: 'test'});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooHandle = await mapHandleToStore(arc, recipe, fooClass, 0);
    const barHandle = await mapHandleToStore(arc, recipe, fooClass, 1);

    await barHandle.set(new fooClass({value: 'Set!'}));

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await fooHandle.fetch(), new fooClass({value: 'Ready!'}));
  });

  it('onReady runs when there are no handles to sync', async () => {
    const manifest = await Manifest.parse(`
      schema Foo
        value: Text
      particle UpdatingParticle in 'updating-particle.js'
        innerFoo: writes Foo
      recipe
        h0: use *
        UpdatingParticle
          innerFoo: h0
    `);
    assert.lengthOf(manifest.recipes, 1);
    const recipe = manifest.recipes[0];
    const loader = new Loader(null, {
      'updating-particle.js': `
        'use strict';
        defineParticle(({Particle}) => {
          var created = false;
          return class extends Particle {
            onFirstStart() {
              created = true;
            }
            onReady(handle, model) {
              this.innerFooHandle = this.handles.get('innerFoo');
              if (created) {
                this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
              } else {
                this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Not created!"}));
              }
            }
          };
        });
      `
    });
    const runtime = new Runtime({context: manifest, loader});
    const arc = runtime.newArc({arcName: 'test'});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooHandle = await mapHandleToStore(arc, recipe, fooClass, 0);

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await fooHandle.fetch(), new fooClass({value: 'Created!'}));
  });
});
