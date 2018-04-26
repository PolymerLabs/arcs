/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../runtime/test/chai-web.js';

import Arc from '../../runtime/arc.js';
import DomParticle from '../../runtime/dom-particle.js';
import Loader from '../../runtime/loader.js';
import Manifest from '../../runtime/manifest.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import SlotComposer from '../../runtime/slot-composer.js';
import MockSlotComposer from './mock-slot-composer.js';


let loader = new Loader();

describe('Multiplexer', function() {
  it('Processes multiple inputs', async () => {
    let manifest = await Manifest.parse(`
      import 'shell/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'slotid' as s0
        use 'test:1' as v0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as s0
          list <- v0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let barType = manifest.findTypeByName('Bar');

    let slotComposer = new SlotComposer({affordance: 'mock', rootContext: 'slotid'});

    let slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    let arc = new Arc({id: 'test', context: manifest, slotComposer});
    let handle = await arc.createHandle(barType.setViewOf(), null, 'test:1');
    recipe.handles[0].mapToStorage(handle);
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await handle.store({id: 'a', rawData: {value: 'one'}});
    await handle.store({id: 'b', rawData: {value: 'two'}});
    await handle.store({id: 'c', rawData: {value: 'three'}});

    await arc.idle;

    assert.equal(slotsCreated, 3);
  });

  const processManifest = async content => {
    let registry = {};
    let loader = new class extends Loader {
      loadResource(path) {
        return content[path];
      }
      path(fileName) {
        return fileName;
      }
      join(_, file) {
        return file;
      }
    };
    return Manifest.load('manifest', loader, {registry});
  };

  const buildEmbeddedItemValues = async name => {
    const sourceFilename = `${name}.js`;
    const manifest = await processManifest({manifest: `
        schema Frob
          Text renderParticleSpec
          Text renderRecipe

        schema ${name}Item
          Text dummy${name}

        particle ${name} in 'runtime/test/artifacts/transformations/test-mux-${name.toLowerCase()}.js'
          ${name}(in Frob frob)
          consume item
      `
    });
    const renderParticle = manifest.particles[0];
    const renderParticleSpec = JSON.stringify(renderParticle.toLiteral());
    const renderRecipe = DomParticle
                             .buildManifest`
${renderParticle}
recipe
  use '{{item_id}}' as v1
  slot '{{slot_id}}' as s1
  ${renderParticle.name}
    ${renderParticle.connections[0].name} <- v1
    consume item as s1
  `.trim();
    return {renderParticleSpec, renderRecipe: renderRecipe.replace(/[\n]/g, '\\n')};
  };

  it('varies render particle across heterogeneous items with embedded recipes', async () => {
    let resultA = await buildEmbeddedItemValues('A');
    let resultB = await buildEmbeddedItemValues('B');

    const manifest = await Manifest.parse(`
import 'shell/artifacts/Common/List.manifest'

schema Frob
  Text renderParticleSpec
  Text renderRecipe

store Frobs of [Frob] in FrobsJson
 resource FrobsJson
   start
   [
     {"renderParticleSpec": ${JSON.stringify(resultA.renderParticleSpec)},
      "renderRecipe": "${resultA.renderRecipe}"},
     {"renderParticleSpec": ${JSON.stringify(resultB.renderParticleSpec)},
      "renderRecipe": "${resultB.renderRecipe}"}
    ]

particle FrobMuxer in 'runtime/test/artifacts/transformations/frob-muxer.js'
  FrobMuxer(in [Frob] list)
  consume set of item

recipe
  use Frobs as frobs
  List
    items = frobs
  FrobMuxer
    list = frobs
    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];
    let slotComposer = new MockSlotComposer({strict: false});
    slotComposer
      .newExpectations()
      .expectRenderSlot('A', 'item', {contentTypes: ['template', 'model'], verify: (content) => {
        if (content.template == '<div mux-a><{{value}}</div>') {
          return true;
        }
      }})
      .expectRenderSlot('B', 'item', {contentTypes: ['template', 'model'], verify: (content) => {
        if (content.template == '<div mux-b><{{value}}</div>') {
          return true;
        }
      }})
      .expectRenderSlot('FrobMuxer', 'item', {contentTypes: ['template', 'model'], verify: content => {
        if (Object.keys(content.template).length == 2 &&
            Object.values(content.template)[0] == '<div mux-a><{{value}}</div>' &&
            Object.values(content.template)[1] == '<div mux-b><{{value}}</div>') {
          return true;
        }
      }})
      ;

    let arc = new Arc({id: 'test', context: manifest, slotComposer});
    const resolvedRecipe = await new RecipeResolver(arc).resolve(recipe);
    await arc.instantiate(resolvedRecipe);
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();
  });
});
