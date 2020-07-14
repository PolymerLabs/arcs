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
import {Manifest} from '../manifest.js';
import {Loader} from '../../platform/loader.js';
import {EntityType, ReferenceType, CollectionType, SingletonType} from '../type.js';
import {Id, ArcId} from '../id.js';
import {Entity} from '../entity.js';
import {VolatileStorageKey} from '../storage/drivers/volatile.js';
import {ReferenceModeStorageKey} from '../storage/reference-mode-storage-key.js';
import {Reference} from '../reference.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {Runtime} from '../runtime.js';
import {storeType, handleForStore} from '../storage/storage.js';

describe('reference', () => {
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
    assert.strictEqual((recipe.handles[0].type.resolvedType() as ReferenceType<EntityType>).referredType.entitySchema.name, 'Result');
  });

  it('exposes a dereference API to particles for singleton handles', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle Dereferencer in 'dereferencer.js'
          inResult: reads &Result
          outResult: writes Result

        recipe
          handle0: use 'input:1'
          handle1: use 'output:1'
          Dereferencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      './dereferencer.js': `
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
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const refModeStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );
    const refStore = await arc.createStore(
      new SingletonType(new ReferenceType(result.type)),
      undefined,
      'input:1',
      undefined,
      new VolatileStorageKey(arc.id, 'refStore')
    );
    const outStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'output:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'c'), new VolatileStorageKey(arc.id, 'd'))
    );

    recipe.handles[0].mapToStorage(refStore);
    recipe.handles[1].mapToStorage(outStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const inHandle = await handleForStore(refModeStore, arc);
    const entity = await inHandle.setFromData({value: 'val1'});
    const refHandle = await handleForStore(refStore, arc);
    await refHandle.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, storeType(refStore).getContainedType(), null));
    await arc.idle;

    const outHandle = await handleForStore(outStore, arc);
    const value = await outHandle.fetch();
    assert.deepStrictEqual(value as {}, {value: 'val1'});
  });

  it('exposes a dereference API to particles for collection handles', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle Dereferencer in 'dereferencer.js'
          inResult: reads [&Result]
          outResult: writes [Result]

        recipe
          handle0: use 'input:1'
          handle1: use 'output:1'
          Dereferencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      './dereferencer.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                for (const ref of update.added) {
                  await ref.dereference();
                  this.output.add(ref.entity);
                }
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const refModeStore1 = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );
    const refModeStore2 = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:2',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'c'), new VolatileStorageKey(arc.id, 'd'))
    );
    const inputStore = await arc.createStore(
      new CollectionType(new ReferenceType(result.type)),
      undefined,
      'input:1',
      undefined,
      new VolatileStorageKey(arc.id, 'inputStore')
    );
    const outputStore = await arc.createStore(
      new CollectionType(result.type),
      undefined,
      'output:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'e'), new VolatileStorageKey(arc.id, 'f'))
    );

    recipe.handles[0].mapToStorage(inputStore);
    recipe.handles[1].mapToStorage(outputStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const handle1 = await handleForStore(refModeStore1, arc);
    const handle2 = await handleForStore(refModeStore2, arc);
    const entity1 = await handle1.setFromData({value: 'val1'});
    const entity2 = await handle2.setFromData({value: 'val2'});

    const refHandle = await handleForStore(inputStore, arc);
    await refHandle.add(new Reference({id: Entity.id(entity1), entityStorageKey: refModeStore1.storageKey.toString()}, storeType(inputStore).getContainedType(), null));
    await refHandle.add(new Reference({id: Entity.id(entity2), entityStorageKey: refModeStore2.storageKey.toString()}, storeType(inputStore).getContainedType(), null));

    await arc.idle;

    const outHandle = await handleForStore(outputStore, arc);
    const values = await outHandle.toList();
    assert.deepStrictEqual(values as {}[], [{value: 'val1'}, {value: 'val2'}]);
  });

  it('can construct references of entities stored in reference mode store', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text
  
        particle Referencer in 'referencer.js'
          inResult: reads Result
          outResult: writes &Result
  
        recipe
          handle0: use 'test:1'
          handle1: use 'test:2'
          Referencer
            inResult: reads handle0
            outResult: writes handle1
      `,
      './referencer.js': `
        defineParticle(({Particle, Reference}) => {
          return class Referencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
            }
  
            async onHandleSync(handle, model) {
              if (handle.name == 'inResult') {
                let entity = await handle.fetch();
                let reference = new Reference(entity);
                await reference.stored;
                await this.output.set(reference);
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const inputStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );

    const refStore = await arc.createStore(
      new SingletonType(new ReferenceType(result.type)),
      undefined,
      'test:2',
      undefined,
      new VolatileStorageKey(arc.id, 'refStore')
    );

    recipe.handles[0].mapToStorage(inputStore);
    recipe.handles[1].mapToStorage(refStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const handle = await handleForStore(inputStore, arc);
    const entity = await handle.setFromData({value: 'what a result!'});
    await arc.idle;

    const storageKey = Entity.storageKey(entity);
    const refHandle = await handleForStore(refStore, arc);
    const reference = await refHandle.fetch();
    assert.equal(reference['id'], Entity.id(entity));
    assert.equal(reference['entityStorageKey'], storageKey);
  });

  it('can deal with references in schemas', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle ExtractReference in 'extractReference.js'
          referenceIn: reads Foo {result: &Result}
          rawOut: writes Result

        recipe
          handle0: use 'input:1'
          handle1: use 'output:1'
          ExtractReference
            referenceIn: reads handle0
            rawOut: writes handle1
        `,
      './extractReference.js': `
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
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const resultEntity = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const entityStore = await arc.createStore(
      new SingletonType(resultEntity.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );

    const referenceIn = manifest.particles[0].handleConnectionMap.get('referenceIn');
    const refType = referenceIn.type as EntityType;
    const inputStore = await arc.createStore(
      new SingletonType(refType),
      undefined,
      'input:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'e'), new VolatileStorageKey(arc.id, 'f'))
    );

    const outStore = await arc.createStore(
      new SingletonType(resultEntity.type),
      undefined,
      'output:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'c'), new VolatileStorageKey(arc.id, 'd'))
    );

    recipe.handles[0].mapToStorage(inputStore);
    recipe.handles[1].mapToStorage(outStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const entityHandle = await handleForStore(entityStore, arc);
    const entity = await entityHandle.setFromData({value: 'what a result!'});
    const inHandle = await handleForStore(inputStore, arc);
    await inHandle.setFromData({result: new Reference({id: Entity.id(entity), entityStorageKey: entityStore.storageKey.toString()}, new ReferenceType(resultEntity.type), null)});
    await arc.idle;

    const outHandle = await handleForStore(outStore, arc);
    assert.strictEqual(outHandle.type.getContainedType().getEntitySchema().name, 'Result');
    const out = await outHandle.fetch();
    assert.equal(out.value, 'what a result!');
  });

  it('can construct references in schemas', async () => {
    // This test looks at different scenarios for creating references
    // inside schemas. It:
    // * reads a single value from the reads writes connection 'out'
    // * reads the single 'inFoo'
    // * reads a collection of Results from 'inResult'.
    // * puts a Result into each of the Foos retrieved from 'out' and 'inFoo'
    // * writes the Foos back to 'out'.
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle Referencer in 'referencer.js'
          inResult: reads [Result]
          inFoo: reads Foo {result: &Result, shortForm: Text}
          outResult: reads writes [Foo {result: &Result, shortForm: Text}]

        recipe
          handle0: use 'input:1'
          handle1: use 'input:2'
          handle2: use 'output:1'
          Referencer
            inResult: reads handle0
            inFoo: reads handle1
            outResult: handle2
      `,
      './referencer.js': `
        defineParticle(({Particle, Reference}) => {
          return class Referencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('outResult');
              this.foos = [];
              this.models = [];
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                if (update.added.length) {
                  update.added.forEach(item => this.models.push(item));
                } else {
                  this.models.push(update.added);
                }
              } else {
                if (update.added) {
                  if (update.added.length) {
                    update.added.forEach(item => this.foos.push(item));
                  } else {
                    this.foos.push(update.added);
                  }
                }
              }
              this.maybeGenerateOutput();
            }

            async onHandleSync(handle, model) {
              if (!model || model.length == 0)
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
                      this.output.remove(foo);
                      this.mutate(foo, {result: ref});
                      this.output.add(foo);
                    }
                  }
                }
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();
    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];

    // create 'input:1' store to hold [Result]
    const resultType = Entity.createEntityClass(manifest.findSchemaByName('Result'), null).type;
    const resultInputStore = await arc.createStore(
      new CollectionType(resultType),
      undefined,
      'input:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );

    const fooType = manifest.particles[0].handleConnectionMap.get('inFoo').type as EntityType;
    const fooInputStore = await arc.createStore(
      new SingletonType(fooType),
      undefined,
      'input:2',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'c'), new VolatileStorageKey(arc.id, 'd'))
    );

    const fooOutputStore = await arc.createStore(
      new CollectionType(fooType),
      undefined,
      'output:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'e'), new VolatileStorageKey(arc.id, 'f'))
    );

    recipe.handles[0].mapToStorage(resultInputStore);
    recipe.handles[1].mapToStorage(fooInputStore);
    recipe.handles[2].mapToStorage(fooOutputStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const fooInHandle = await handleForStore(fooInputStore, arc);
    await fooInHandle.setFromData({result: null, shortForm: 'a'});

    const resultInHandle = await handleForStore(resultInputStore, arc);
    const resultInEntities = await resultInHandle.addMultipleFromData([{value: 'this is an a'}, {value: 'this is a b'}]);

    const fooOutHandle = await handleForStore(fooOutputStore, arc);
    await fooOutHandle.addFromData({result: null, shortForm: 'b'});

    await arc.idle;

    const values = await fooOutHandle.toList();
    assert.strictEqual(values.length, 2);
    for (const value of values) {
      if (value.shortForm === 'a') {
        assert.strictEqual(value.result.id, Entity.id(resultInEntities[0]));
      } else if (value.shortForm === 'b') {
        assert.strictEqual(value.result.id, Entity.id(resultInEntities[1]));
      } else {
        assert.isTrue(false);
      }
    }
  });

  it('can construct collections of references in schemas of entities stored in reference mode store', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle ConstructReferenceCollection in 'constructReferences.js'
          rawIn: reads [Result]
          referenceOut: writes Foo {result: [&Result]}

        recipe
          handle0: use 'input:1'
          handle1: use 'output:1'
          ConstructReferenceCollection
            rawIn: reads handle0
            referenceOut: writes handle1
        `,
      './constructReferences.js': `
        defineParticle(({Particle, Reference}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('referenceOut');
              this.results = [];
              this.generated = false;
            }

            async onHandleSync(handle, model) {
              model.forEach(result => this.results.push(result));
              this.maybeGenerateOutput();
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'rawIn') {
                if (update.added.length) {
                  update.added.forEach(result => this.results.push(result));
                } else {
                  this.results.push(update.added);
                }
                this.maybeGenerateOutput();
              }
            }

            async maybeGenerateOutput() {
              if (this.results.length == 2 && !this.generated) {
                this.generated = true;
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
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);
    const referenceOut = manifest.particles[0].handleConnectionMap.get('referenceOut');
    const refType = referenceOut.type as EntityType;

    const inputStore = await arc.createStore(
      new CollectionType(result.type),
      undefined,
      'input:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );
    const refStore = await arc.createStore(
      new SingletonType(refType),
      undefined,
      'output:1',
      undefined,
      new VolatileStorageKey(arc.id, 'refStore')
    );

    recipe.handles[0].mapToStorage(inputStore);
    recipe.handles[1].mapToStorage(refStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const handle = await handleForStore(inputStore, arc);
    assert.strictEqual((handle.type.getContainedType() as EntityType).entitySchema.name, 'Result');
    const now = new Date().getTime();
    await handle.add(Entity.identify(new handle.entityClass({value: 'what a result!'}), 'id:1', null, now));
    await handle.add(Entity.identify(new handle.entityClass({value: 'what another result!'}), 'id:2', null, now));

    await arc.idle;
    const outputHandle = await handleForStore(refStore, arc);
    assert.strictEqual(outputHandle.type.getContainedType().getEntitySchema().name, 'Foo');
    const outputRefs = await outputHandle.fetch();
    const ids = [...outputRefs.result].map(ref => ref.id);
    assert.sameMembers(ids, ['id:1', 'id:2']);
  });

  it('can deal with collections of references in schemas', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle ExtractReferences in 'extractReferences.js'
          referenceIn: reads Foo {result: [&Result]}
          rawOut: writes [Result]

        recipe
          handle0: use 'input:1'
          handle1: use 'output:1'
          ExtractReferences
            referenceIn: reads handle0
            rawOut: writes handle1
        `,
      './extractReferences.js': `
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
                  this.output.add(result.entity);
                }
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];

    const resultType = Entity.createEntityClass(manifest.findSchemaByName('Result'), null).type;
    const resultInputStore = await arc.createStore(
      new CollectionType(resultType),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'a'), new VolatileStorageKey(arc.id, 'b'))
    );

    const fooType = manifest.particles[0].handleConnectionMap.get('referenceIn').type as EntityType;
    const fooInputStore = await arc.createStore(
      new SingletonType(fooType),
      undefined,
      'input:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'c'), new VolatileStorageKey(arc.id, 'd'))
    );

    const resultOutputStore = await arc.createStore(
      new CollectionType(resultType),
      undefined,
      'output:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'e'), new VolatileStorageKey(arc.id, 'f'))
    );

    recipe.handles[0].mapToStorage(fooInputStore);
    recipe.handles[1].mapToStorage(resultOutputStore);

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const handle = await handleForStore(resultInputStore, arc);
    const resultEntities = await handle.addMultipleFromData([{value: 'what a result!'}, {value: 'what another result!'}]);

    const fooInHandle = await handleForStore(fooInputStore, arc);
    await fooInHandle.setFromData({result: [
      {id: Entity.id(resultEntities[0]), creationTimestamp: Entity.creationTimestamp(resultEntities[0]), entityStorageKey: Entity.storageKey(resultEntities[0])},
      {id: Entity.id(resultEntities[1]), creationTimestamp: Entity.creationTimestamp(resultEntities[1]), entityStorageKey: Entity.storageKey(resultEntities[1])},
    ]});

    await arc.idle;

    const outputHandle = await handleForStore(resultOutputStore, arc);
    assert.strictEqual((outputHandle.type.getContainedType() as EntityType).entitySchema.name, 'Result');
    const values = await outputHandle.toList();
    assert.strictEqual(values.length, 2);
    assert.strictEqual(values[0].value, 'what a result!');
    assert.strictEqual(values[1].value, 'what another result!');
  });
});
