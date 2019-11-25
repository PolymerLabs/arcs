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
import {StubLoader} from '../runtime/testing/stub-loader.js';
import {Manifest} from '../runtime/manifest.js';
import {Arc} from '../runtime/arc.js';
import {ArcId} from '../runtime/id.js';
import {Loader} from '../platform/loader.js';
import {FakeSlotComposer} from '../runtime/testing/fake-slot-composer.js';
import {FakePecFactory} from '../runtime/fake-pec-factory.js';
import {HeadlessSlotDomConsumer} from '../runtime/headless-slot-dom-consumer.js';
import {singletonHandleForTest} from '../runtime/testing/handle-for-test.js';

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
    const loader = new StubLoader({
      'A.js': `defineParticle(({DomParticle}) => {
        return class extends DomParticle {
          get template() { return 'Hello <span>{{name}}</span>, old age: <span>{{age}}</span>'; }

          render() {
            return {name: 'Jack', age: '10'};
          }
        };
      });`
    });

    const id = ArcId.newForTest('HotReload');
    const pecFactories = [FakePecFactory(loader).bind(null)];
    const slotComposer = new FakeSlotComposer();
    const arc = new Arc({id, pecFactories, slotComposer, loader, context});

    const [recipe] = arc.context.recipes;
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;
    const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;

    assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '10'});
    assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, old age: <span>{{age}}</span>`);

    loader._fileMap['A.js'] = `defineParticle(({DomParticle}) => {
      return class extends DomParticle {
        get template() { return 'Hello <span>{{name}}</span>, new age: <span>{{age}}</span>'; }

        render() {
          return {name: 'Jack', age: '15'};
        }
      };
    });`;
    arc.pec.reload(arc.pec.particles);
    await arc.idle;

    assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '15'});
    assert.deepStrictEqual(slotConsumer._content.template, `Hello <span>{{name}}</span>, new age: <span>{{age}}</span>`);
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

    const loader = new StubLoader({
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
    assert.deepStrictEqual(await personHandleOut.get(), {name: 'Jack', age: 30});

    loader._fileMap['A.js'] = `defineParticle(({Particle}) => {
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
    arc.pec.reload(arc.pec.particles);
    await arc.idle;
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jane', age: 20}));
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.get(), {name: 'Jane', age: 18});
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
    const context = await Manifest.parse(`
      particle HotReloadTest in 'bazel-bin/src/tests/source/wasm-particle.wasm'
        root: consumes Slot

      recipe
        slot0: slot 'rootslotid-root'
        HotReloadTest
          root: consumes slot0`);
    const loader = new StubWasmLoader();

    const id = ArcId.newForTest('HotReload');
    const pecFactories = [FakePecFactory(loader).bind(null)];
    const slotComposer = new FakeSlotComposer();
    const arc = new Arc({id, pecFactories, slotComposer, loader, context});

    const [recipe] = arc.context.recipes;
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;
    const slotConsumer = slotComposer.consumers[0] as HeadlessSlotDomConsumer;

    assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '10'});
    assert.deepStrictEqual(slotConsumer._content.template, `<div>Hello <span>{{name}}</span>, old age: <span>{{age}}</span></div>`);

    loader.reloaded = true;
    arc.pec.reload(arc.pec.particles);
    await arc.idle;

    assert.deepStrictEqual(slotConsumer.getRendering().model,  {name: 'Jack', age: '15'});
    assert.deepStrictEqual(slotConsumer._content.template, `<div>Hello <span>{{name}}</span>, new age: <span>{{age}}</span></div>`);
  });

  it('ensures new handles are working', async () => {
    const loader = new StubWasmLoader();
    const context = await Manifest.parse(`
      import 'src/tests/source/schemas.arcs'

      particle ReloadHandleTest in 'build/tests/source/test-module.wasm'
        personIn: reads Person
        personOut: writes Person

      recipe
        personIn: use *
        personOut: use *
        ReloadHandleTest
          personIn: reads personIn
          personOut: writes personOut`, {loader, fileName: './input.arcs'});

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
    assert.deepStrictEqual(await personHandleOut.get(), {name: 'Jack', age: 30});

    loader.reloaded = true;
    arc.pec.reload(arc.pec.particles);
    await arc.idle;
    await personHandleIn.set(new personHandleIn.entityClass({name: 'Jane', age: 20}));
    await arc.idle;
    assert.deepStrictEqual(await personHandleOut.get(), {name: 'Jane', age: 18});
  });
});
