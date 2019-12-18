/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Manifest} from '../manifest.js';
import {CollectionStorageProvider, SingletonStorageProvider} from '../storage/storage-provider-base.js';
import {VolatileStorage} from '../storage/volatile-storage.js';
import {StubLoader} from '../testing/stub-loader.js';
import {EntityType, ReferenceType, CollectionType} from '../type.js';
import {Id} from '../id.js';
import {collectionHandleForTest, singletonHandleForTest} from '../testing/handle-for-test.js';
import {Entity} from '../entity.js';

describe('references', () => {
  it('can parse & validate a recipe containing references', async () => {
    const manifest = await Manifest.parse(`
        schema Result
          value: Text

        particle Referencer in 'referencer.js'
          inResult: reads Result
          outResult: writes &Result

        particle Dereferencer in 'dereferencer.js'
          inResult: reads &Result
          outResult: writes Result

        recipe
          handle0: create 'input:1'
          handle1: create 'reference:1'
          handle2: create 'output:1'
          Referencer
            inResult: reads handle0
            outResult: writes handle1
          Dereferencer
            inResult: reads handle1
            outResult: writes handle2
    `);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    assert.strictEqual(recipe.handles[0].id, 'reference:1');
    recipe.handles[0].type.maybeEnsureResolved();
    assert.instanceOf(recipe.handles[0].type, ReferenceType);
    assert.strictEqual(((recipe.handles[0].type.resolvedType() as ReferenceType).referredType as EntityType).entitySchema.name, 'Result');
  });

  it('exposes a dereference API to particles for singleton handles', async () => {
    const loader = new StubLoader({
      'manifest': `
        schema Result
          value: Text

        particle Dereferencer in 'dereferencer.js'
          inResult: reads &Result
          outResult: writes Result

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          Dereferencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      'dereferencer.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                await update.data.dereference();
                this.output.set(update.data.entity);
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const refStore = arc._stores[0] as SingletonStorageProvider;
    assert.isTrue(refStore.type instanceof ReferenceType);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const backingStore = await volatileEngine.baseStorageFor(refStore.type, volatileEngine.baseStorageKey(refStore.type));
    await backingStore.store({id: 'id1', rawData: {value: 'val1'}}, ['key1']);
    await refStore.set({id: 'id1', storageKey: backingStore.storageKey});
    await arc.idle;

    const outStore = arc._stores[1] as SingletonStorageProvider;
    const value = (await outStore.get()).rawData;
    assert.deepStrictEqual(value, {value: 'val1'});
  });

  it('exposes a dereference API to particles for collection handles', async () => {
    const loader = new StubLoader({
      'manifest': `
        schema Result
          value: Text

        particle Dereferencer in 'dereferencer.js'
          inResult: reads [&Result]
          outResult: writes [Result]

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          Dereferencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      'dereferencer.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                for (const ref of update.added) {
                  await ref.dereference();
                  this.output.store(ref.entity);
                }
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const refStore = arc._stores[0] as CollectionStorageProvider;
    assert.instanceOf(refStore.type, CollectionType);

    const resType = refStore.type.getContainedType();
    assert.instanceOf(resType, ReferenceType);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const backingStore = await volatileEngine.baseStorageFor(resType, volatileEngine.baseStorageKey(resType));
    await backingStore.store({id: 'id1', rawData: {value: 'val1'}}, ['key1']);
    await backingStore.store({id: 'id2', rawData: {value: 'val2'}}, ['key2']);
    await refStore.store({id: 'id1', storageKey: backingStore.storageKey}, ['key1a']);
    await refStore.store({id: 'id2', storageKey: backingStore.storageKey}, ['key2a']);
    await arc.idle;

    const outStore = await collectionHandleForTest(arc, arc._stores[1]);
    const values = await outStore.toList();
    assert.deepStrictEqual(values, [{value: 'val1'}, {value: 'val2'}]);
  });

  it('exposes a reference API to particles', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          value: Text

        particle Referencer in 'referencer.js'
          inResult: reads Result
          outResult: writes &Result

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          Referencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      'referencer.js': `
        defineParticle(({Particle, Reference}) => {
          return class Referencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
            }

            async onHandleSync(handle, model) {
              if (handle.name == 'inResult') {
                let entity = await handle.get();
                let reference = new Reference(entity);
                await reference.stored;
                await this.output.set(reference);
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});

    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const inputStore = arc._stores[0] as SingletonStorageProvider;
    await inputStore.set({id: 'id:1', rawData: {value: 'what a result!'}});
    await arc.idle;

    const refStore = arc._stores[1] as SingletonStorageProvider;
    const baseStoreType = new EntityType(manifest.schemas.Result);
    const storageKey = arc.storageProviderFactory.baseStorageKey(baseStoreType, 'volatile');
    assert.deepStrictEqual((await refStore.get()).rawData, {id: 'id:1', storageKey});
  });

  it('can deal with references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          value: Text

        particle ExtractReference in 'extractReference.js'
          referenceIn: reads Foo {result: &Result}
          rawOut: writes Result

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          ExtractReference
            referenceIn: reads handle0
            rawOut: writes handle1
        `,
      'extractReference.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('rawOut');
            }

            async onHandleSync(handle, model) {
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'referenceIn') {
                let result = update.data.result;
                await result.dereference();
                this.output.set(result.entity);
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const baseStoreType = new EntityType(manifest.schemas.Result);
    const backingStore = await volatileEngine.baseStorageFor(baseStoreType, volatileEngine.baseStorageKey(baseStoreType)) as CollectionStorageProvider;
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);

    const refStore = arc._stores[1] as SingletonStorageProvider;
    assert.strictEqual((refStore.type as EntityType).entitySchema.name, 'Foo');
    await refStore.set({id: 'id:2', rawData: {result: {id: 'id:1', storageKey: backingStore.storageKey}}});
    await arc.idle;

    const store = arc._stores[0] as SingletonStorageProvider;
    assert.deepStrictEqual((await store.get()).rawData, {value: 'what a result!'});
  });

  it('can construct references in schemas', async () => {
    // This test looks at different scenarios for creating references
    // inside schemas. It:
    // * reads a single value from the reads writes connection 'out'
    // * reads the single 'inFoo'
    // * reads a collction of Results from 'inResult'.
    // * puts a Result into each of the Foos retrieved from 'out' and 'inFoo'
    // * writes the Foos back to 'out'.
    const loader = new StubLoader({
      manifest: `
        schema Result
          value: Text

        particle Referencer in 'referencer.js'
          inResult: reads [Result]
          inFoo: reads Foo {result: &Result, shortForm: Text}
          outResult: reads writes [Foo {result: &Result, shortForm: Text}]

        recipe
          handle0: create 'input:1'
          handle1: create 'input:2'
          handle2: create 'output:1'
          Referencer
            inResult: reads handle0
            inFoo: reads handle1
            outResult: handle2
      `,
      'referencer.js': `
        defineParticle(({Particle, Reference}) => {
          return class Referencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
              this.foos = [];
              this.models = [];
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                update.added.forEach(item => this.models.push(item));
              } else {
                if (update.added) {
                  update.added.forEach(item => this.foos.push(item));
                }
              }
              this.maybeGenerateOutput();
            }

            async onHandleSync(handle, model) {
              if (model.length == 0)
                return;
              if (handle.name == 'inResult') {
                model.forEach(item => this.models.push(item));
              } else if (handle.name == 'inFoo') {
                this.foos.push(model);
              } else {
                model.forEach(item => this.foos.push(item));
              }
              this.maybeGenerateOutput();
            }

            async maybeGenerateOutput() {
              if (this.foos.length == 2 && this.models.length == 2) {
                for (const model of this.models) {
                  for (const foo of this.foos) {
                    if (foo.shortForm === model.value[model.value.length - 1]) {
                      let ref = new Reference(model);
                      await ref.stored;
                      this.mutate(foo, {result: ref});
                      this.output.store(foo);
                    }
                  }
                }
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const fooStore = arc._stores[0] as SingletonStorageProvider;
    assert.strictEqual((fooStore.type as EntityType).entitySchema.name, 'Foo');
    await fooStore.set({id: 'id:1', rawData: {result: null, shortForm: 'a'}});

    const inputStore = await collectionHandleForTest(arc, arc._stores[1]);
    assert.strictEqual((inputStore.type.getContainedType() as EntityType).entitySchema.name, 'Result');
    await inputStore.add(Entity.identify(new inputStore.entityClass({value: 'this is an a'}), 'id:a'));
    await inputStore.add(Entity.identify(new inputStore.entityClass({value: 'this is a b'}), 'id:b'));

    const outputStore = await collectionHandleForTest(arc, arc._stores[2]);
    assert.strictEqual((outputStore.type.getContainedType() as EntityType).entitySchema.name, 'Foo');
    await outputStore.add(Entity.identify(new outputStore.entityClass({result: null, shortForm: 'b'}), 'id:2'));

    await arc.idle;
    const values = await outputStore.toList();
    assert.strictEqual(values.length, 2);
    for (const value of values) {
      if (value.shortForm === 'a') {
        assert.strictEqual(value.result.id, 'id:a');
      } else if (value.shortForm === 'b') {
        assert.strictEqual(value.result.id, 'id:b');
      } else {
        assert.isTrue(false);
      }
    }
  });

  it('can deal with collections of references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          value: Text

        particle ExtractReferences in 'extractReferences.js'
          referenceIn: reads Foo {result: [&Result]}
          rawOut: writes [Result]

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          ExtractReferences
            referenceIn: reads handle0
            rawOut: writes handle1
        `,
      'extractReferences.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('rawOut');
            }

            async onHandleSync(handle, model) {
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'referenceIn') {
                for (const result of update.data.result) {
                  await result.dereference();
                  this.output.store(result.entity);
                }
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const baseStoreType = new EntityType(manifest.schemas.Result);
    const backingStore = await volatileEngine.baseStorageFor(baseStoreType, volatileEngine.baseStorageKey(baseStoreType)) as CollectionStorageProvider;
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);
    await backingStore.store({id: 'id:2', rawData: {value: 'what another result!'}}, ['totes a key']);

    const refStore = arc._stores[1] as SingletonStorageProvider;
    assert.strictEqual((refStore.type as EntityType).entitySchema.name, 'Foo');
    await refStore.set({id: 'id:a', rawData: {result: [{id: 'id:1', storageKey: backingStore.storageKey}, {id: 'id:2', storageKey: backingStore.storageKey}]}});

    await arc.idle;
    const outputStore = await collectionHandleForTest(arc, arc._stores[0]);
    assert.strictEqual((outputStore.type.getContainedType() as EntityType).entitySchema.name, 'Result');
    const values = await outputStore.toList();
    assert.strictEqual(values.length, 2);
    assert.strictEqual(values[0].value, 'what a result!');
    assert.strictEqual(values[1].value, 'what another result!');
  });

  it('can construct collections of references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          value: Text

        particle ConstructReferenceCollection in 'constructReferenceCollection.js'
          referenceOut: writes Foo {result: [&Result]}
          rawIn: reads [Result]

        recipe
          handle0: create 'input:1'
          handle1: create 'output:1'
          ConstructReferenceCollection
            referenceOut: writes handle0
            rawIn: reads handle1
        `,
      'constructReferenceCollection.js': `
        defineParticle(({Particle, Reference}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('referenceOut');
              this.results = [];
            }

            async onHandleSync(handle, model) {
              model.forEach(result => this.results.push(result));
              this.maybeGenerateOutput();
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'rawIn') {
                update.added.forEach(result => this.results.push(result));
                this.maybeGenerateOutput();
              }
            }

            async maybeGenerateOutput() {
              if (this.results.length == 2) {
                const data = {result: new Set()};
                for (const result of this.results) {
                  const ref = new Reference(result);
                  await ref.stored;
                  data.result.add(ref);
                }
                this.results = [];
                this.output.set(new this.output.entityClass(data));
              }
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: Id.fromString('test:0'), loader, context: manifest});
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const inputStore = await collectionHandleForTest(arc, arc._stores[0]);
    assert.strictEqual((inputStore.type.getContainedType() as EntityType).entitySchema.name, 'Result');
    await inputStore.add(Entity.identify(new inputStore.entityClass({value: 'what a result!'}), 'id:1'));
    await inputStore.add(Entity.identify(new inputStore.entityClass({value: 'what another result!'}), 'id:2'));

    await arc.idle;
    const outputStore = await singletonHandleForTest(arc, arc._stores[1]);
    assert.strictEqual((outputStore.type as EntityType).entitySchema.name, 'Foo');
    const outputRefs = await outputStore.get();
    const ids = [...outputRefs.result].map(ref => ref.id);
    assert.sameMembers(ids, ['id:1', 'id:2']);
  });
});
