/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { assert } from '../../../../../build/platform/chai-web.js';
import { Arc } from '../../../../../build/runtime/arc.js';
import { Id, ArcId, IdGenerator } from '../../../../../build/runtime/id.js';
import { Loader } from '../../../../../build/platform/loader.js';
import { Manifest } from '../../../../../build/runtime/manifest.js';
import { SlotComposer } from '../../../../../build/runtime/slot-composer.js';
import { Entity } from '../../../../../build/runtime/entity.js';
import { DriverFactory } from '../../../../../build/runtime/storage/drivers/driver-factory.js';
import { VolatileStorageKey } from '../../../../../build/runtime/storage/drivers/volatile.js';
import { StorageServiceImpl } from '../../../../../build/runtime/storage/storage-service.js';
import { handleForStoreInfo } from '../../../../../build/runtime/storage/storage.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';
describe('Arc', () => {
    afterEach(() => {
        DriverFactory.clearRegistrationsForTesting();
    });
    it('deserializing a serialized arc with a Transformation produces that arc', async () => {
        const loader = new Loader();
        const manifest = await Manifest.parse(`
      import 'shells/tests/artifacts/Common/Multiplexer.manifest'
      import 'shells/tests/artifacts/test-particles.manifest'

      recipe
        slot0: slot 'rootslotid-slotid'
        handle0: use *
        Multiplexer
          hostedParticle: ConsumerParticle
          annotation: consumes slot0
          list: reads handle0

    `, { loader, fileName: '' });
        const recipe = manifest.recipes[0];
        const slotComposer = new SlotComposer();
        const id = Id.fromString('test2');
        const storageKey = new VolatileStorageKey(id, '');
        const arc = new Arc({ id, storageKey, context: manifest, slotComposer, loader: new Loader(), storageService: new StorageServiceImpl() });
        const barType = manifest.findTypeByName('Bar');
        let store = await arc.createStore(barType.collectionOf(), undefined, 'test:1');
        recipe.handles[0].mapToStorage(store);
        assert(recipe.normalize());
        assert(recipe.isResolved());
        await arc.instantiate(recipe);
        await arc.idle;
        const serialization = await arc.serialize();
        arc.dispose();
        const newArc = await Arc.deserialize({ serialization, loader, slotComposer, fileName: './manifest.manifest', context: manifest, storageService: new StorageServiceImpl() });
        await newArc.idle;
        store = newArc.findStoreById(store.id);
        const handle = await handleForStoreInfo(store, newArc);
        await handle.add(new handle.entityClass({ value: 'one' }));
        await newArc.idle;
        //assert.strictEqual(slotComposer.slotsCreated, 1);
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
            sources[`${current}.js`] = `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          async setHandles(handles) {
            super.setHandles(handles);

            const innerArc = await this.constructInnerArc();
            const hostedSlotId = await innerArc.createSlot(this, 'root');

            await innerArc.loadRecipe(\`
              particle ${next} in '${next}.js'
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
        const slotComposer = new SlotComposer();
        const loader = new Loader(null, {
            ...sources,
            'Z.js': `defineParticle(({UiParticle}) => {
        return class extends UiParticle {
          getTemplate() { return 'Z'; }
        };
      });`,
        });
        const context = await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot

      recipe
        root: slot 'rootslotid-root'
        A
          root: consumes root
    `);
        const id = IdGenerator.newSession().newArcId('arcid');
        const arc = new Arc({ id, loader, slotComposer, context, storageService: new StorageServiceImpl() });
        const [recipe] = arc.context.recipes;
        recipe.normalize();
        await arc.instantiate(recipe);
    });
    it('handles serialization/deserialization of empty arcs handles', async () => {
        const id = ArcId.newForTest('test');
        const loader = new Loader();
        const manifest = await Manifest.parse(`
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
        `, { loader, fileName: process.cwd() + '/input.manifest' });
        const storageKey = new VolatileStorageKey(id, '');
        const arc = new Arc({ id, storageKey, loader: new Loader(), context: manifest, storageService: new StorageServiceImpl() });
        assert.isNotNull(arc);
        const favoriteFoodClass = Entity.createEntityClass(manifest.findSchemaByName('FavoriteFood'), null);
        assert.isNotNull(favoriteFoodClass);
        const recipe = manifest.recipes[0];
        assert.isNotNull(recipe);
        const favoriteFoodType = manifest.findTypeByName('FavoriteFood');
        assert.isNotNull(favoriteFoodType, 'FavoriteFood type is found');
        const options = { errors: new Map() };
        const normalized = recipe.normalize(options);
        assert(normalized, 'not normalized ' + options.errors);
        assert(recipe.isResolved());
        await arc.instantiate(recipe);
        const serialization = await arc.serialize();
        const slotComposer = new SlotComposer();
        const newArc = await Arc.deserialize({ serialization, loader, slotComposer, context: manifest, fileName: 'foo.manifest', storageService: new StorageServiceImpl() });
        assert.strictEqual(newArc.stores.length, 1);
        assert.strictEqual(newArc.activeRecipe.toString(), `@active\n${arc.activeRecipe.toString()}`);
        assert.strictEqual(newArc.id.idTreeAsString(), 'test');
    });
});
//# sourceMappingURL=arc-test.js.map