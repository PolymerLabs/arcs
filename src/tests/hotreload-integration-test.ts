/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Manifest} from '../runtime/manifest.js';
import {Loader} from '../platform/loader.js';
import {handleForStoreInfo} from '../runtime/storage/storage.js';
import {SingletonType, EntityType} from '../types/lib-types.js';
import {Runtime} from '../runtime/runtime.js';

const manifestFile = 'src/tests/source/schemas.arcs';

class StubWasmLoader extends Loader {
  public reloaded = false;
  resolve(path: string) {
    return (path[0] === '$') ? `RESOLVED(${path})`: path;
  }
  async loadBinaryResource(path: string): Promise<ArrayBuffer> {
    const file = this.reloaded ? 'wasm-particle-new.wasm' : 'wasm-particle-old.wasm';
    return super.loadBinaryResource(`src/tests/source/${file}`);
  }
  clone(): StubWasmLoader {
    return this;
  }
}

describe('Hot Code Reload for JS Particle', async () => {
  it('ensures new handles are working', async () => {
    const context = await Manifest.parse(`
      schema Person
        name: Text
        age: Number

      particle A in 'A.js'
        personIn: reads Person
        personOut: writes Person

      recipe
        personIn: use *
        personOut: use *
        A
          personIn: reads personIn
          personOut: writes personOut
    `);

    const loader = new Loader(null, {
      'A.js': `defineParticle(({Particle}) => {
        return class extends Particle {
          async setHandles(handles) {
            this.handleOut = handles.get('personOut');
          }
          onHandleSync(handle, model) {
            this.update(model);
          }
          onHandleUpdate(handle, update) {
            this.update(update.data);
          }
          async update(value) {
            await this.handleOut.set(new this.handleOut.entityClass({name: value.name, age: (value.age * 2)}));
          }
        };
      });`
    });

    const runtime = new Runtime({context, loader});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test'}));
    const personType = context.findTypeByName('Person') as EntityType;

    const personStoreIn = await arc.createStore(new SingletonType(personType));
    const personStoreOut = await arc.createStore(new SingletonType(personType));
    const personHandleIn = await handleForStoreInfo(personStoreIn, arc);
    const personHandleOut = await handleForStoreInfo(personStoreOut, arc);
    await personHandleIn.setFromData({name: 'Jack', age: 15});

    const recipe = context.recipes[0];
    recipe.handles[0].mapToStorage(personStoreIn);
    recipe.handles[1].mapToStorage(personStoreOut);

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch() as {}, {name: 'Jack', age: 30});

    loader.staticMap['A.js'] = `defineParticle(({Particle}) => {
      return class extends Particle {
        async setHandles(handles) {
          this.handleOut = handles.get('personOut');
        }
        onHandleSync(handle, model) {
          this.update(model);
        }
        onHandleUpdate(handle, update) {
          this.update(update.data);
        }
        async update(value) {
          await this.handleOut.set(new this.handleOut.entityClass({name: value.name, age: (value.age - 2)}));
        }
      };
    });`;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;
    await personHandleIn.setFromData({name: 'Jane', age: 20});
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch() as {}, {name: 'Jane', age: 18});
  });
});

describe('Hot Code Reload for WASM Particle', async () => {
  before(function() {
    if (!global['testFlags'].bazel) {
      this.skip();
    }
  });

  // TODO(sjmiles): skipping because it was already nerfed and then it stopped working altogether. I don't want to stop
  // and fix this until after the shells reorg (9/2020).
  it.skip('updates model and template', async () => {
    // StubWasmLoader returns wasm-particle-old.wasm or wasm-particle-new.wasm instead of
    // wasm-particle.wasm based on the reloaded flag
    const loader = new StubWasmLoader();
    const context = await Manifest.load(manifestFile, loader);

    const runtime = new Runtime({loader, context});
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'HotReload'}));
    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    //const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;
    // assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '10'});
    // assert.deepStrictEqual(slotConsumer._content.template, `<div>Hello <span>{{name}}</span>, old age: <span>{{age}}</span></div>`);

    loader.reloaded = true;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    // assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '15'});
    // assert.deepStrictEqual(slotConsumer._content.template, `<div>Hello <span>{{name}}</span>, new age: <span>{{age}}</span></div>`);
  });

  it('ensures new handles are working', async () => {
    const loader = new StubWasmLoader();
    const context = await Manifest.load(manifestFile, loader);

    const runtime = new Runtime({loader, context});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test'}));
    const personType = context.findTypeByName('Person') as EntityType;

    const personStoreIn = await arc.createStore(new SingletonType(personType));
    const personStoreOut = await arc.createStore(new SingletonType(personType));
    const personHandleIn = await handleForStoreInfo(personStoreIn, arc);
    const personHandleOut = await handleForStoreInfo(personStoreOut, arc);
    await personHandleIn.setFromData({name: 'Jack', age: 15});

    const recipe = context.recipes.filter(r => r.name === 'ReloadHandleRecipe')[0];
    recipe.handles[0].mapToStorage(personStoreIn);
    recipe.handles[1].mapToStorage(personStoreOut);

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch() as {}, {name: 'Jack', age: 30});

    loader.reloaded = true;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jane', age: 20}));
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch() as {}, {name: 'Jane', age: 18});
  });
});
