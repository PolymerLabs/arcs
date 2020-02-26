/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Manifest} from '../runtime/manifest.js';
import {Arc} from '../runtime/arc.js';
import {ArcId} from '../runtime/id.js';
import {Loader} from '../platform/loader.js';
import {SlotComposer} from '../runtime/slot-composer.js';
import {FakePecFactory} from '../runtime/fake-pec-factory.js';
import {singletonHandleForTest} from '../runtime/testing/handle-for-test.js';
import {RuntimeCacheService} from '../runtime/runtime-cache.js';

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
  it('updates model and template', async () =>{
    const context = await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot

      recipe
        slot0: slot 'rootslotid-root'
        A
          root: consumes slot0`);
    const loader = new Loader(null, {
      'A.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          get template() { return 'Hello <span>{{name}}</span>, old age: <span>{{age}}</span>'; }

          render() {
            return {name: 'Jack', age: '10'};
          }
        };
      });`
    });

    const id = ArcId.newForTest('HotReload');
    const pecFactories = [FakePecFactory(loader).bind(null)];
    const slotComposer = new SlotComposer();
    const arc = new Arc({id, pecFactories, slotComposer, loader, context});

    const [recipe] = arc.context.recipes;
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    //const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;
    //assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '10'});
    //assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, old age: <span>{{age}}</span>`);

    loader.staticMap['A.js'] = `defineParticle(({UiParticle}) => {
      return class extends UiParticle {
        get template() { return 'Hello <span>{{name}}</span>, new age: <span>{{age}}</span>'; }

        render() {
          return {name: 'Jack', age: '15'};
        }
      };
    });`;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;

    // TODO(sjmiles): render data no longer captured by slot objects
    //assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '15'});
    //assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, new age: <span>{{age}}</span>`);
  });

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

    const arc = new Arc({id: ArcId.newForTest('test'), context, loader});
    const personType = context.findTypeByName('Person');

    const personStoreIn = await arc.createStore(personType);
    const personStoreOut = await arc.createStore(personType);
    const personHandleIn = await singletonHandleForTest(arc, personStoreIn);
    const personHandleOut = await singletonHandleForTest(arc, personStoreOut);
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jack', age: 15}));

    const recipe = context.recipes[0];
    recipe.handles[0].mapToStorage(personStoreIn);
    recipe.handles[1].mapToStorage(personStoreOut);
    assert.isTrue(recipe.normalize() && recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch(), {name: 'Jack', age: 30});

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
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jane', age: 20}));
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch(), {name: 'Jane', age: 18});
  });
});

describe('Hot Code Reload for WASM Particle', async () => {
  before(function() {
    if (!global['testFlags'].bazel) {
      this.skip();
    }
  });

  it('updates model and template', async () => {
    // StubWasmLoader returns wasm-particle-old.wasm or wasm-particle-new.wasm instead of
    // wasm-particle.wasm based on the reloaded flag
    const loader = new StubWasmLoader();
    const context = await Manifest.load(manifestFile, loader);

    const id = ArcId.newForTest('HotReload');
    const pecFactories = [FakePecFactory(loader).bind(null)];
    const slotComposer = new SlotComposer();
    const arc = new Arc({id, pecFactories, slotComposer, loader, context});

    const recipe = context.recipes.filter(r => r.name === 'HotReloadRecipe')[0];
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
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

    const arc = new Arc({id: ArcId.newForTest('test'), context, loader});
    const personType = context.findTypeByName('Person');

    const personStoreIn = await arc.createStore(personType);
    const personStoreOut = await arc.createStore(personType);
    const personHandleIn = await singletonHandleForTest(arc, personStoreIn);
    const personHandleOut = await singletonHandleForTest(arc, personStoreOut);
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jack', age: 15}));

    const recipe = context.recipes.filter(r => r.name === 'ReloadHandleRecipe')[0];
    recipe.handles[0].mapToStorage(personStoreIn);
    recipe.handles[1].mapToStorage(personStoreOut);
    assert.isTrue(recipe.normalize() && recipe.isResolved());

    await arc.instantiate(recipe);
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch(), {name: 'Jack', age: 30});

    loader.reloaded = true;
    arc.peh.reload(arc.peh.particles);
    await arc.idle;
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jane', age: 20}));
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.fetch(), {name: 'Jane', age: 18});
  });
});
