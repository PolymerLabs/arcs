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
import {MessageChannel} from '../message-channel.js';
import {InnerPEC} from '../inner-PEC.js';
import {Loader} from '../loader.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Recipe} from '../recipe/recipe.js';
import {Type} from '../type.js';
import {Shape} from '../shape.js';
import {ParticleSpec} from '../particle-spec.js';

describe('particle-shape-loading', function() {

  it('loads shapes into particles', async () => {
    let loader = new StubLoader({
      'outer-particle.js': `
          "use strict";

          defineParticle(({Particle}) => {
            return class P extends Particle {
              async setHandles(handles) {
                let arc = await this.constructInnerArc();
                var inputHandle = handles.get('input');
                let outputHandle = handles.get('output');
                let inHandle = await arc.createHandle(inputHandle.type, "input");
                let outHandle = await arc.createHandle(outputHandle.type, "output");
                let particle = await handles.get('particle').get();

                var recipe = Particle.buildManifest\`
                  \${particle}

                  recipe
                    use \${inHandle} as handle1
                    use \${outHandle} as handle2
                    \${particle.name}
                      foo <- handle1
                      bar -> handle2
                \`;

                try {
                  await arc.loadRecipe(recipe);
                  var input = await inputHandle.get();
                  inHandle.set(input);
                  outHandle.on('change', async () => {
                    var output = await outHandle.get();
                    if (output != null)
                      outputHandle.set(output);
                  }, this);
                } catch (e) {
                  console.log(e);
                }
              }
            }
          });`});

    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new InnerPEC(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };

    let arc = new Arc({id: 'test', pecFactory});

    let manifest = await Manifest.load('./runtime/test/artifacts/test-particles.manifest', loader);

    let fooType = Type.newEntity(manifest.schemas.Foo);
    let barType = Type.newEntity(manifest.schemas.Bar);

    let shape = new Shape('Test', [{type: fooType}, {type: barType}], []);

    let shapeType = Type.newInterface(shape);

    let outerParticleSpec = new ParticleSpec({
      name: 'outerParticle',
      implFile: 'outer-particle.js',
      args: [
        {direction: 'host', type: shapeType, name: 'particle', dependentConnections: []},
        {direction: 'in', type: fooType, name: 'input', dependentConnections: []},
        {direction: 'out', type: barType, name: 'output', dependentConnections: []}
      ],
    });

    let shapeStore = await arc.createStore(shapeType);
    shapeStore.set(manifest.particles[0].toLiteral());
    let outStore = await arc.createStore(barType);
    let inStore = await arc.createStore(fooType);
    let Foo = manifest.schemas.Foo.entityClass();
    inStore.set(new Foo({value: 'a foo'}));

    let recipe = new Recipe();
    let particle = recipe.newParticle('outerParticle');
    particle.spec = outerParticleSpec;

    let recipeShapeHandle = recipe.newHandle();
    particle.connections['particle'].connectToHandle(recipeShapeHandle);
    recipeShapeHandle.fate = 'use';
    recipeShapeHandle.mapToStorage(shapeStore);

    let recipeOutHandle = recipe.newHandle();
    particle.connections['output'].connectToHandle(recipeOutHandle);
    recipeOutHandle.fate = 'use';
    recipeOutHandle.mapToStorage(outStore);

    let recipeInHandle = recipe.newHandle();
    particle.connections['input'].connectToHandle(recipeInHandle);
    recipeInHandle.fate = 'use';
    recipeInHandle.mapToStorage(inStore);

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(outStore, manifest.schemas.Bar.entityClass(), 'a foo1');

  });

  it('loads shapes into particles declaratively', async () => {
    let loader = new Loader();

    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new InnerPEC(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };

    let manifest = await Manifest.parse(`
      import './runtime/test/artifacts/test-particles.manifest'

      recipe
        create as h0
        create as h1
        OuterParticle
          particle <- TestParticle
          output -> h0
          input <- h1
      `, {loader, fileName: './test.manifest'});

    let arc = new Arc({id: 'test', pecFactory, context: manifest});

    let fooType = manifest.findTypeByName('Foo');
    let barType = manifest.findTypeByName('Bar');

    let shapeType = manifest.findTypeByName('TestShape');

    let recipe = manifest.recipes[0];

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    arc.findStoresByType(fooType)[0].set(new (fooType.entitySchema.entityClass())({value: 'a foo'}));

    await util.assertSingletonWillChangeTo(arc.findStoresByType(barType)[0], barType.entitySchema.entityClass(), 'a foo1');

  });
});
