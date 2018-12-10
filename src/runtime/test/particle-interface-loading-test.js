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
import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {Arc} from '../arc.js';
import {Loader} from '../loader.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Recipe} from '../recipe/recipe.js';
import {EntityType, InterfaceType} from '../type.js';
import {InterfaceInfo} from '../interface-info.js';
import {ParticleSpec} from '../particle-spec.js';

describe('particle interface loading', function() {

  it('loads interfaces into particles', async () => {
    const loader = new StubLoader({
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
                      use \${this.inHandle} as handle1
                      use \${this.outHandle} as handle2
                      \${model.name}
                        foo <- handle1
                        bar -> handle2
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

    const arc = new Arc({id: 'test', loader});

    const manifest = await Manifest.load('./src/runtime/test/artifacts/test-particles.manifest', loader);

    const fooType = new EntityType(manifest.schemas.Foo);
    const barType = new EntityType(manifest.schemas.Bar);

    const ifaceType = InterfaceType.make('Test', [{type: fooType}, {type: barType}], []);

    const outerParticleSpec = new ParticleSpec({
      name: 'outerParticle',
      implFile: 'outer-particle.js',
      args: [
        {direction: 'host', type: ifaceType, name: 'particle0', dependentConnections: []},
        {direction: 'in', type: fooType, name: 'input', dependentConnections: []},
        {direction: 'out', type: barType, name: 'output', dependentConnections: []}
      ],
    });

    const ifaceStore = await arc.createStore(ifaceType);
    await ifaceStore.set(manifest.particles[0].toLiteral());
    const outStore = await arc.createStore(barType);
    const inStore = await arc.createStore(fooType);
    await inStore.set({id: 'id', rawData: {value: 'a foo'}});

    const recipe = new Recipe();
    const particle = recipe.newParticle('outerParticle');
    particle.spec = outerParticleSpec;

    const recipeInterfaceHandle = recipe.newHandle();
    particle.connections['particle0'].connectToHandle(recipeInterfaceHandle);
    recipeInterfaceHandle.fate = 'use';
    recipeInterfaceHandle.mapToStorage(ifaceStore);

    const recipeOutHandle = recipe.newHandle();
    particle.connections['output'].connectToHandle(recipeOutHandle);
    recipeOutHandle.fate = 'use';
    recipeOutHandle.mapToStorage(outStore);

    const recipeInHandle = recipe.newHandle();
    particle.connections['input'].connectToHandle(recipeInHandle);
    recipeInHandle.fate = 'use';
    recipeInHandle.mapToStorage(inStore);

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(arc, outStore, 'value', 'a foo1');
  });

  it('loads interfaces into particles declaratively', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import './src/runtime/test/artifacts/test-particles.manifest'

      recipe
        create as h0
        create as h1
        OuterParticle
          particle0 <- TestParticle
          output -> h0
          input <- h1
      `, {loader, fileName: './test.manifest'});

    const arc = new Arc({id: 'test', context: manifest});

    const fooType = manifest.findTypeByName('Foo');
    const barType = manifest.findTypeByName('Bar');

    const recipe = manifest.recipes[0];

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    await arc.findStoresByType(fooType)[0].set({id: 'id', rawData: {value: 'a foo'}});

    await util.assertSingletonWillChangeTo(arc, arc.findStoresByType(barType)[0], 'value', 'a foo1');
  });
});
