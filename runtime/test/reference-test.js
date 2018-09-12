/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Manifest} from '../manifest.js';
import {MessageChannel} from '../message-channel.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Type} from '../ts-build/type.js';
import {Arc} from '../arc.js';
import {assertSingletonWillChangeTo} from '../testing/test-util.js';

describe('references', function() {
  it('can parse & validate a recipe containing references', async () => {
    let manifest = await Manifest.parse(`
        schema Result
          Text value  

        particle Referencer in 'referencer.js'
          in Result in
          out Reference<Result> out

        particle Dereferencer in 'dereferencer.js'
          in Reference<Result> in
          out Result out
        
        recipe
          create 'input:1' as handle0
          create 'reference:1' as handle1
          create 'output:1' as handle2
          Referencer
            in <- handle0
            out -> handle1
          Dereferencer
            in <- handle1
            out -> handle2
    `);
    let recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    assert.equal(recipe.handles[0].id, 'reference:1');
    recipe.handles[0].type.maybeEnsureResolved();
    assert.isTrue(recipe.handles[0].type.isReference);
    assert.equal(recipe.handles[0].type.resolvedType().referenceReferredType.data.name, 'Result');
  });

  it('exposes a dereference API to particles', async () => {
    let loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle Dereferencer in 'dereferencer.js'
          in Reference<Result> in
          out Result out
        
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          Dereferencer
            in <- handle0
            out -> handle1
      `,
      'dereferencer.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('out');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'in') {
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

    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id: 'test:0', pecFactory, loader});

    let manifest = await Manifest.load('manifest', loader);
    let recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    assert.isTrue(arc._stores[0]._type.isReference);

    const inMemoryEngine = arc._storageProviderFactory._storageInstances['in-memory'];
    const backingStore = await inMemoryEngine.baseStorageFor(arc._stores[1]._type, inMemoryEngine.baseStorageKey(arc._stores[1]._type));
    await backingStore.store({id: 'id:1', rawData: {value: 'what a result!'}}, ['totes a key']);

    const refStore = arc._stores[0];
    await refStore.set({id: 'id:1', storageKey: backingStore.storageKey});

    await assertSingletonWillChangeTo(arc, arc._stores[1], 'value', 'what a result!');
  });

  it('exposes a reference API to particles', async () => {
    let loader = new StubLoader({
      manifest: `
        schema Result
          Text value
        
        particle Referencer in 'referencer.js'
          in Result in
          out Reference<Result> out
        
        recipe
          create 'input:1' as handle0
          create 'output:1' as handle1
          Referencer
            in <- handle0
            out -> handle1
      `,
      'referencer.js': `
        defineParticle(({Particle, Reference}) => {
          return class Referencer extends Particle {
            setHandles(handles) {
              this.output = handles.get('out');
            }

            async onHandleSync(handle, model) {
              if (handle.name == 'in') {
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

    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id: 'test:0', pecFactory, loader});

    let manifest = await Manifest.load('manifest', loader);
    let recipe = manifest.recipes[0];    
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);

    const inputStore = arc._stores[0];
    await inputStore.set({id: 'id:1', rawData: {value: 'what a result!'}});

    const refStore = arc._stores[1];
    await assertSingletonWillChangeTo(arc, refStore, 'storageKey', arc._storageProviderFactory.baseStorageKey(Type.newEntity(manifest.schemas.Result), 'in-memory'));
  });
});
