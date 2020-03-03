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
import {Recipe} from '../recipe/recipe.js';
import {EntityType, InterfaceType, SingletonType} from '../type.js';
import {ParticleSpec} from '../particle-spec.js';
import {ArcId} from '../id.js';
import {singletonHandleForTest} from '../testing/handle-for-test.js';
import {VolatileStorageKey} from '../storageNG/drivers/volatile.js';
import {StorageProxy} from '../storageNG/storage-proxy.js';
import {handleNGFor, SingletonHandle} from '../storageNG/handle.js';
import {Entity} from '../entity.js';
import {singletonHandle, SingletonInterfaceStore, SingletonEntityStore} from '../storageNG/storage-ng.js';

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
          });`});

    const manifest = await Manifest.load('./src/runtime/tests/artifacts/test-particles.manifest', loader);
    const arc = new Arc({id: ArcId.newForTest('test'), loader, context: manifest});

    const fooType = new EntityType(manifest.schemas.Foo);
    const barType = new EntityType(manifest.schemas.Bar);

    const ifaceType = InterfaceType.make('Test', [{type: fooType}, {type: barType}], []);

    const outerParticleSpec = new ParticleSpec({
      name: 'outerParticle',
      description: {},
      external: false,
      implBlobUrl: '',
      modality: ['dom'],
      slotConnections: [],
      verbs: [],
      implFile: 'outer-particle.js',
      args: [
        {direction: 'hosts', relaxed: false, type: ifaceType, name: 'particle0', dependentConnections: [], isOptional: false},
        {direction: 'reads', relaxed: false, type: fooType, name: 'input', dependentConnections: [], isOptional: false},
        {direction: 'writes', relaxed: false, type: barType, name: 'output', dependentConnections: [], isOptional: false}
      ],
    });

    const ifaceStore = await arc.createStore(ifaceType) as SingletonInterfaceStore;
    const outStore = await arc.createStore(barType);
    const inStore = await arc.createStore(fooType) as SingletonEntityStore;
    const ifaceHandle = singletonHandle(await ifaceStore.activate(), arc);
    await ifaceHandle.set(manifest.particles[0]);
    const inHandle = singletonHandle(await inStore.activate(), arc);
    await inHandle.set(new inHandle.entityClass({value: 'a foo'}));

    const recipe = new Recipe();
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
    const outHandle = await singletonHandleForTest(arc, outStore);
    assert.deepStrictEqual(await outHandle.fetch(), {value: 'a foo1'});
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

    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});

    const fooType = manifest.findTypeByName('Foo');
    const barType = manifest.findTypeByName('Bar');

    const recipe = manifest.recipes[0];

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    const fooStore = arc.findStoresByType(fooType)[0];
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    await fooHandle.set(new fooHandle.entityClass({value: 'a foo'}));

    await arc.idle;

    const barStore = arc.findStoresByType(barType)[0];
    const barHandle = await singletonHandleForTest(arc, barStore);
    assert.deepEqual(await barHandle.fetch(), {value: 'a foo1'});
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
    const arc = new Arc({id: ArcId.newForTest('test'), context: manifest, loader});
    const fooType = manifest.findTypeByName('Foo');
    const fooStore = await arc.createStore(fooType);
    recipe.handles[0].mapToStorage(fooStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;
    const fooHandle = await singletonHandleForTest(arc, fooStore);
    assert.deepStrictEqual(await fooHandle.fetch(), {value: 'hello world!!!'});
  });

  it('onCreate only runs for initialization and not reinstantiation', async () => {
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
            async onCreate() {
              this.innerFooHandle = this.handles.get('innerFoo');
              await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
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
    const id = ArcId.newForTest('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:0');
    const varStorageProxy = new StorageProxy('id', await fooStore.activate(), new SingletonType(fooClass.type), fooStore.storageKey.toString());
    const fooHandle = await handleNGFor('crdt-key', varStorageProxy, arc.idGenerator, null, true, true, 'fooHandle') as SingletonHandle<Entity>;
    recipe.handles[0].mapToStorage(fooStore);

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await fooHandle.fetch(), new fooClass({value: 'Created!'}));

    const serialization = await arc.serialize();
    arc.dispose();

    const arc2 = await Arc.deserialize({serialization, loader, fileName: '', context: manifest});
    await arc2.idle;

    const varStorageProxy2 = new StorageProxy('id', await arc2._stores[0].activate(), new SingletonType(fooClass.type), arc2._stores[0].storageKey.toString());
    const fooHandle2 = await handleNGFor('crdt-key', varStorageProxy2, arc2.idGenerator, null, true, true, 'varHandle') as SingletonHandle<Entity>;
    assert.deepStrictEqual(await fooHandle2.fetch(), new fooClass({value: 'Not created!'}));
  });

  it('onReady sees overriden values in onCreate', async () => {
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
            async onCreate() {
              this.barHandle = this.handles.get('bar');
              await this.barHandle.set(new this.barHandle.entityClass({value: "Created!"}));
            }
            
            async onReady() {
              this.barHandle = this.handles.get('bar');
              this.bar = await this.barHandle.fetch();
          
              if(this.bar.value == "Created!") {
                await this.barHandle.set(new this.barHandle.entityClass({value: "Ready!"}))
              } else {
                await this.barHandle.set(new this.barHandle.entityClass({value: "Handle not overriden by onCreate!"}))
              }  
            }
          };
        });
      `
    });
    const id = ArcId.newForTest('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const barStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:1');
    const barStorageProxy = new StorageProxy('id', await barStore.activate(), new SingletonType(fooClass.type), barStore.storageKey.toString());
    const barHandle = await handleNGFor('crdt-key', barStorageProxy, arc.idGenerator, null, true, true, 'fooHandle') as SingletonHandle<Entity>;
    recipe.handles[0].mapToStorage(barStore);

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
            async onCreate() {
              this.innerFooHandle = this.handles.get('innerFoo');
              await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
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
                s = s + " onCreate was not called before onReady.";
              } 
              if (this.bar.value != "Set!") {
                s = s + " Read only handles not initialised in onReady";
              } 
              if (handlesSynced != 2) {
                s = s + " Not all handles were synced before onReady was called.";
              } 
              
              await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: s}))
              
            }
          };
        });
      `
    });
    const id = ArcId.newForTest('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:0');
    const fooStorageProxy = new StorageProxy('id', await fooStore.activate(), new SingletonType(fooClass.type), fooStore.storageKey.toString());
    const fooHandle = await handleNGFor('crdt-key', fooStorageProxy, arc.idGenerator, null, true, true, 'fooHandle') as SingletonHandle<Entity>;
    recipe.handles[0].mapToStorage(fooStore);

    const barStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:1');
    const barStorageProxy = new StorageProxy('id', await barStore.activate(), new SingletonType(fooClass.type), barStore.storageKey.toString());
    const barHandle = await handleNGFor('crdt-key', barStorageProxy, arc.idGenerator, null, true, true, 'fooHandle') as SingletonHandle<Entity>;
    recipe.handles[1].mapToStorage(barStore);

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
            async onCreate() {
              created = true;
            }
            async onReady(handle, model) {
              this.innerFooHandle = this.handles.get('innerFoo');
              if (created) {
                await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Created!"}));
              } else {
                await this.innerFooHandle.set(new this.innerFooHandle.entityClass({value: "Not created!"}));
              }
            }
          };
        });
      `
    });
    const id = ArcId.newForTest('test');
    const storageKey = new VolatileStorageKey(id, 'unique');
    const arc = new Arc({id, storageKey, loader, context: manifest});
    const fooClass = Entity.createEntityClass(manifest.findSchemaByName('Foo'), null);

    const fooStore = await arc.createStore(new SingletonType(fooClass.type), undefined, 'test:0');
    const varStorageProxy = new StorageProxy('id', await fooStore.activate(), new SingletonType(fooClass.type), fooStore.storageKey.toString());
    const fooHandle = await handleNGFor('crdt-key', varStorageProxy, arc.idGenerator, null, true, true, 'fooHandle') as SingletonHandle<Entity>;
    recipe.handles[0].mapToStorage(fooStore);

    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await fooHandle.fetch(), new fooClass({value: 'Created!'}));
  });
});
