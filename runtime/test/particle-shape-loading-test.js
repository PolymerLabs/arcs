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
import {Arc} from '../arc.js';
import {MessageChannel} from '../message-channel.js';
import {InnerPEC} from '../inner-PEC.js';
import {Loader} from '../loader.js';
import Recipe from '../recipe/recipe.js';
import {Type} from '../type.js';
import {Shape} from '../shape.js';
import {ParticleSpec} from '../particle-spec.js';
import * as util from './test-util.js';

describe('particle-shape-loading', function() {

  it('loads shapes into particles', async () => {
    let loader = new class extends Loader {
      loadResource(path) {
        if (path == 'outer-particle.js')
          return `
          "use strict";

          defineParticle(({Particle}) => {
            return class P extends Particle {
              async setViews(views) {
                let arc = await this.constructInnerArc();
                var inputView = views.get('input');
                let outputView = views.get('output');
                let inView = await arc.createHandle(inputView.type, "input");
                let outView = await arc.createHandle(outputView.type, "output");
                let particle = await views.get('particle').get();

                var recipe = Particle.buildManifest\`
                  \${particle}

                  recipe
                    use \${inView} as v1
                    use \${outView} as v2
                    \${particle.name}
                      foo <- v1
                      bar -> v2
                \`;

                try {
                  await arc.loadRecipe(recipe);
                  var input = await inputView.get();
                  inView.set(input);
                  outView.on('change', async () => {
                    var output = await outView.get();
                    if (output != null)
                      outputView.set(output);
                  }, this);
                } catch (e) {
                  console.log(e);
                }
              }
            }
          });
          `;
        return super.loadResource(path);
      }
    }();

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

    let shapeView = await arc.createHandle(shapeType);
    shapeView.set(manifest.particles[0].toLiteral());
    let outView = await arc.createHandle(barType);
    let inView = await arc.createHandle(fooType);
    let Foo = manifest.schemas.Foo.entityClass();
    inView.set(new Foo({value: 'a foo'}));

    let recipe = new Recipe();
    let particle = recipe.newParticle('outerParticle');
    particle.spec = outerParticleSpec;

    let recipeShapeView = recipe.newHandle();
    particle.connections['particle'].connectToHandle(recipeShapeView);
    recipeShapeView.fate = 'use';
    recipeShapeView.mapToStorage(shapeView);

    let recipeOutView = recipe.newHandle();
    particle.connections['output'].connectToHandle(recipeOutView);
    recipeOutView.fate = 'use';
    recipeOutView.mapToStorage(outView);

    let recipeInView = recipe.newHandle();
    particle.connections['input'].connectToHandle(recipeInView);
    recipeInView.fate = 'use';
    recipeInView.mapToStorage(inView);

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(outView, manifest.schemas.Bar.entityClass(), 'a foo1');

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
        create as v0
        create as v1
        OuterParticle
          particle <- TestParticle
          output -> v0
          input <- v1
      `, {loader, fileName: './test.manifest'});

    let arc = new Arc({id: 'test', pecFactory, context: manifest});  

    let fooType = manifest.findTypeByName('Foo');
    let barType = manifest.findTypeByName('Bar');

    let shapeType = manifest.findTypeByName('TestShape');

    let recipe = manifest.recipes[0];

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    arc.findHandlesByType(fooType)[0].set(new (fooType.entitySchema.entityClass())({value: 'a foo'}));

    await util.assertSingletonWillChangeTo(arc.findHandlesByType(barType)[0], barType.entitySchema.entityClass(), 'a foo1');

  });
});
