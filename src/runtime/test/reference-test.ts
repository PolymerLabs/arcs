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
import {CollectionStorageProvider, VariableStorageProvider} from '../storage/storage-provider-base.js';
import {VolatileStorage} from '../storage/volatile-storage.js';
import {StubLoader} from '../testing/stub-loader.js';
import {assertSingletonWillChangeTo} from '../testing/test-util.js';
import {EntityType, ReferenceType} from '../type.js';

describe('references', () => {
  it('can parse & validate a recipe containing references', async () => {
    const manifest = await Manifest.parse(`
        schema Result
          Text value  

        particle Referencer in 'referencer.js'
          in Result inResult
          out Reference<Result> outResult

        particle Dereferencer in 'dereferencer.js'
          in Reference<Result> inResult
          out Result outResult
        
        recipe
          create 'input:1' as handle0
          create 'reference:1' as handle1
          create 'output:1' as handle2
          Referencer
            inResult <- handle0
            outResult -> handle1
          Dereferencer
            inResult <- handle1
            outResult -> handle2
    `);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    assert.equal(recipe.handles[0].id, 'reference:1');
    recipe.handles[0].type.maybeEnsureResolved();
    assert.isTrue(recipe.handles[0].type instanceof ReferenceType);
    assert.equal(((recipe.handles[0].type.resolvedType() as ReferenceType).referredType as EntityType).entitySchema.name, 'Result');
  });

  it('exposes a dereference API to particles', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle Dereferencer in 'dereferencer.js'
          in Reference<Result> inResult
          out Result outResult
        
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          Dereferencer
            inResult <- handle0
            outResult -> handle1
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

            onHandleDesync(handle) {
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test:0', loader, context: manifest});
    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    assert.isTrue(arc._stores[0].type instanceof ReferenceType);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const backingStore = await volatileEngine.baseStorageFor(arc._stores[1].type, volatileEngine.baseStorageKey(arc._stores[1].type));
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);

    const refStore = arc._stores[0] as VariableStorageProvider;
    await refStore.set({id: 'id:1', storageKey: backingStore.storageKey});

    await assertSingletonWillChangeTo(arc, arc._stores[1], 'value', 'what a result!');
  });

  it('exposes a reference API to particles', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle Referencer in 'referencer.js'
          in Result inResult
          out Reference<Result> outResult
        
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          Referencer
            inResult <- handle0
            outResult -> handle1
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

            onHandleDesync(handle) {
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test:0', loader, context: manifest});

    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const inputStore = arc._stores[0] as VariableStorageProvider;
    await inputStore.set({id: 'id:1', rawData: {value: 'what a result!'}});

    const refStore = arc._stores[1];
    const baseStoreType = new EntityType(manifest.schemas.Result);
    await assertSingletonWillChangeTo(arc, refStore, 'storageKey', 
                                      arc.storageProviderFactory.baseStorageKey(baseStoreType, 'volatile'));
  });

  it('can deal with references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle ExtractReference in 'extractReference.js'
          in Foo {Reference<Result> result} referenceIn
          out Result rawOut
          
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          ExtractReference
            referenceIn <- handle0
            rawOut -> handle1
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

            onHandleDesync(handle) {
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test:0', loader, context: manifest});
    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const baseStoreType = new EntityType(manifest.schemas.Result);
    const backingStore = await volatileEngine.baseStorageFor(baseStoreType, volatileEngine.baseStorageKey(baseStoreType)) as CollectionStorageProvider;
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);
    
    const refStore = arc._stores[1] as VariableStorageProvider;
    assert.equal((refStore.type as EntityType).entitySchema.name, 'Foo');
    await refStore.set({id: 'id:2', rawData: {result: {id: 'id:1', storageKey: backingStore.storageKey}}});

    await assertSingletonWillChangeTo(arc, arc._stores[0], 'value', 'what a result!');
  });

  it('can construct references in schemas', async () => {
    // This test looks at different scenarios for creating references
    // inside schemas. It:
    // * reads a single value from the inout connection 'out'
    // * reads the single 'inFoo'
    // * reads a collction of Results from 'inResult'.
    // * puts a Result into each of the Foos retrieved from 'out' and 'inFoo'
    // * writes the Foos back to 'out'.
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle Referencer in 'referencer.js'
          in [Result] inResult
          in Foo {Reference<Result> result, Text shortForm} inFoo
          inout [Foo {Reference<Result> result, Text shortForm}] outResult
        
        recipe
          create 'input:1' as handle0
          create 'input:2' as handle1
          create 'output:1' as handle2
          Referencer
            inResult <- handle0
            inFoo <- handle1
            outResult = handle2
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
                update.added.forEach(item => this.foos.push(item));
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
                      foo.result = ref;
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
    const arc = new Arc({id: 'test:0', loader, context: manifest});
    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const fooStore = arc._stores[0] as VariableStorageProvider;
    assert.equal((fooStore.type as EntityType).entitySchema.name, 'Foo');
    await fooStore.set({id: 'id:1', rawData: {result: null, shortForm: 'a'}});

    const inputStore = arc._stores[1] as CollectionStorageProvider;
    assert.equal(inputStore.type.getContainedType().entitySchema.name, 'Result');
    await inputStore.store({id: 'id:a', rawData: {value: 'this is an a'}}, ['a']);
    await inputStore.store({id: 'id:b', rawData: {value: 'this is a b'}}, ['a']);

    const outputStore = arc._stores[2] as CollectionStorageProvider;
    assert.equal(outputStore.type.getContainedType().entitySchema.name, 'Foo');
    await outputStore.store({id: 'id:2', rawData: {result: null, shortForm: 'b'}}, ['a']);

    await arc.idle;
    const values = await outputStore.toList();
    assert.equal(values.length, 2);
    for (const value of values) {
      if (value.rawData.shortForm === 'a') {
        assert.equal(value.rawData.result.id, 'id:a');
      } else if (value.rawData.shortForm === 'b') {
        assert.equal(value.rawData.result.id, 'id:b');
      } else {
        assert.isTrue(false);
      }
    }
  });

  it('can deal with collections of references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle ExtractReferences in 'extractReferences.js'
          in Foo {[Reference<Result>] result} referenceIn
          out [Result] rawOut
          
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          ExtractReferences
            referenceIn <- handle0
            rawOut -> handle1
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

            onHandleDesync(handle) {
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test:0', loader, context: manifest});
    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const baseStoreType = new EntityType(manifest.schemas.Result);
    const backingStore = await volatileEngine.baseStorageFor(baseStoreType, volatileEngine.baseStorageKey(baseStoreType)) as CollectionStorageProvider;
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);
    await backingStore.store({id: 'id:2', rawData: {value: 'what another result!'}}, ['totes a key']);

    const refStore = arc._stores[1] as VariableStorageProvider;
    assert.equal((refStore.type as EntityType).entitySchema.name, 'Foo');
    await refStore.set({id: 'id:a', rawData: {result: [{id: 'id:1', storageKey: backingStore.storageKey}, {id: 'id:2', storageKey: backingStore.storageKey}]}});

    await arc.idle;
    const outputStore = arc._stores[0] as CollectionStorageProvider;
    assert.equal(outputStore.type.getContainedType().entitySchema.name, 'Result');
    const values = await outputStore.toList();
    assert.equal(values.length, 2);
    assert.equal(values[0].rawData.value, 'what a result!');
    assert.equal(values[1].rawData.value, 'what another result!');
  });

  it('can construct collections of references in schemas', async () => {
    const loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle ConstructReferenceCollection in 'constructReferenceCollection.js'
          out Foo {[Reference<Result>] result} referenceOut
          in [Result] rawIn
          
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          ConstructReferenceCollection
            referenceOut -> handle0
            rawIn <- handle1
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

            onHandleDesync(handle) {
            }
          }
        });
      `
    });

    const manifest = await Manifest.load('manifest', loader);
    const arc = new Arc({id: 'test:0', loader, context: manifest});
    const recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const inputStore = arc._stores[0] as CollectionStorageProvider;
    assert.equal(inputStore.type.getContainedType().entitySchema.name, 'Result');
    await inputStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);
    await inputStore.store({id: 'id:2', rawData: {value: 'what another result!'}}, ['totes a key']);

    await arc.idle;
    const outputStore = arc._stores[1] as VariableStorageProvider;
    assert.equal((outputStore.type as EntityType).entitySchema.name, 'Foo');
    const values = await outputStore.get();
    assert(values.rawData.result.length === 2);
    assert.equal(values.rawData.result[0].id, 'id:1');
    assert.equal(values.rawData.result[1].id, 'id:2');
  });
});
