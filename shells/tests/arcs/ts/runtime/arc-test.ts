/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../../build/platform/chai-web.js';
import {Arc} from '../../../../../build/runtime/arc.js';
import {Id, ArcId, IdGenerator} from '../../../../../build/runtime/id.js';
import {Loader} from '../../../../../build/platform/loader.js';
import {Manifest} from '../../../../../build/runtime/manifest.js';
import {SlotComposer} from '../../../../../build/runtime/slot-composer.js';
import {Entity} from '../../../../../build/runtime/entity.js';
import {EntityType} from '../../../../../build/types/lib-types.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {VolatileStorageKey} from '../../../../../build/runtime/storage/drivers/volatile.js';
import {StoreInfo} from '../../../../../build/runtime/storage/store-info.js';
import {handleForStoreInfo, CollectionEntityType} from '../../../../../build/runtime/storage/storage.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('Arc', () => {
  it('deserializing a serialized arc with a Transformation produces that arc', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parse(`
      import 'src/runtime/tests/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/tests/artifacts/test-particles.manifest'

      recipe
        slot0: slot 'rootslotid-slotid'
        handle0: use *
        Multiplexer
          hostedParticle: ConsumerParticle
          annotation: consumes slot0
          list: reads handle0

    `);

    const opts = runtime.host.buildArcParams({arcName: 'test2'});
    const arc = runtime.newArc({arcId: opts.id});

    const barType = runtime.context.findTypeByName('Bar') as EntityType;
    let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1');

    const recipe = runtime.context.recipes[0];
    recipe.handles[0].mapToStorage(store);

    assert(recipe.normalize());
    assert(recipe.isResolved());

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;

    const serialization = await arc.serialize();
    arc.dispose();
    const {loader, context, slotComposer, storageService, driverFactory, storageKeyParser} = opts;
    const newArc = await Arc.deserialize({serialization, loader, slotComposer, fileName: './manifest.manifest', context, storageService, driverFactory, storageKeyParser});
    await newArc.idle;
    store = newArc.findStoreById(store.id) as StoreInfo<CollectionEntityType>;
    const handle = await handleForStoreInfo(store, newArc);
    await handle.add(new handle.entityClass({value: 'one'}));
    await newArc.idle;

    // assert.strictEqual(slotComposer.slotsCreated, 1);
  });


  // Particle A creates an inner arc with a hosted slot and instantiates B connected to that slot.
  // Whatever template is rendered into the hosted slot gets 'A' prepended and is rendered by A.
  //
  // B performs the same thing, but puts C in its inner arc. C puts D etc. The whole affair stops
  // with Z, which just renders 'Z'.
  //
  // As aresult we get 26 arcs in total, the first one is an outer arc and each next is an inner arc
  // of a preceding one. A ends up rendering 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.
  it('handles recursive inner arcs', async () => {
    const sources = {};
    // 'A', 'B', 'C', ..., 'Y'
    for (let current = 'A'; current < 'Z';) {
      const next = String.fromCharCode(current.charCodeAt(0) + 1);
      sources[`./${current}.js`] = `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            await innerArc.loadRecipe(\`
              particle ${next} in './${next}.js'
                root: consumes Slot

              recipe
                hosted: slot '\` + hostedSlotId + \`'
                ${next}
                  root: consumes hosted
            \`);
          }

          renderHostedSlot(slotName, hostedSlotId, content) {
            this.setState(content);
          }

          shouldRender() {
            return Boolean(this.state.template);
          }

          getTemplate() {
            return '${current}' + this.state.template;
          }
        };
      });`;
      current = next;
    }

    const loader = new Loader(null, {
      ...sources,
      './Z.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          getTemplate() { return 'Z'; }
        };
      });`,
    });
    const runtime = new Runtime({loader});
    runtime.context = await runtime.parse(`
      particle A in 'A.js'
        root: consumes Slot

      recipe
        root: slot 'rootslotid-root'
        A
          root: consumes root
    `);
    const arc = runtime.newArc({arcName: 'arcid'});
    await runtime.allocator.runPlanInArc(arc.id, arc.context.recipes[0]);
  });

  it('handles serialization/deserialization of empty arcs handles', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parse(`
        schema FavoriteFood
          food: Text

        particle FavoriteFoodPicker in 'particles/Profile/source/FavoriteFoodPicker.js'
          foods: reads writes [FavoriteFood]
          description \`select favorite foods\`
            foods \`favorite foods\`

        recipe FavoriteFood
          foods: create #favoriteFoods
          FavoriteFoodPicker
            foods: foods
        `);

    const arc = runtime.newArc({arcName: 'test'});
    assert.isNotNull(arc);

    const favoriteFoodClass = Entity.createEntityClass(runtime.context.findSchemaByName('FavoriteFood'), null);
    assert.isNotNull(favoriteFoodClass);

    const recipe = runtime.context.recipes[0];
    assert.isNotNull(recipe);

    const favoriteFoodType = runtime.context.findTypeByName('FavoriteFood');
    assert.isNotNull(favoriteFoodType, 'FavoriteFood type is found');

    const options = {errors: new Map()};
    const normalized = recipe.normalize(options);
    assert(normalized, 'not normalized ' + options.errors);
    assert(recipe.isResolved());
    await runtime.allocator.runPlanInArc(arc.id, recipe);

    const serialization = await arc.serialize();
    const {loader, slotComposer, context, storageService, driverFactory, capabilitiesResolver, storageKeyParser}
      = runtime.host.buildArcParams({arcName: 'test'});
    const newArc = await Arc.deserialize({serialization, loader, slotComposer, context, fileName: '', storageService, driverFactory, storageKeyParser});
    assert.strictEqual(newArc.stores.length, 1);
    assert.strictEqual(newArc.activeRecipe.toString(), `@active\n${arc.activeRecipe.toString()}`);
    assert.strictEqual(newArc.id.idTreeAsString(), 'test');
  });
});
