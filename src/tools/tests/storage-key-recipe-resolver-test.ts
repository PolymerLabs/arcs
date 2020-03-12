/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../runtime/manifest.js';
import {assert} from '../../platform/chai-node.js';
import {StorageKeyRecipeResolver} from '../storage-key-recipe-resolver.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {DatabaseStorageKey} from '../../runtime/storageNG/database-storage-key.js';
import {CapabilitiesResolver} from '../../runtime/capabilities-resolver.js';
import {Flags} from '../../runtime/flags.js';

describe('recipe2plan', () => {
  describe('storage-key-recipe-resolver', () => {
    beforeEach(() => DatabaseStorageKey.register());
    afterEach(() => CapabilitiesResolver.reset());
    it('detects long running arc', async () => {
      const manifest = (await Manifest.parse(`
          recipe Zero
          @trigger
            key value
          recipe One
          @trigger
            launch startup
            foo bar
          recipe Two
          @trigger
            arcId notLongRunningArc
            foo bar
          recipe Three
          @trigger
            launch startup
            arcId myLongRunningArc
          recipe Four
      `));
      assert.lengthOf(manifest.recipes, 5);
      const resolver = new StorageKeyRecipeResolver(manifest);
      assert.isFalse(resolver.isLongRunning(manifest.recipes[0]));
      assert.isNull(resolver.findLongRunningArcId(manifest.recipes[0]));

      assert.isNull(resolver.findLongRunningArcId(manifest.recipes[1]));
      assert.isFalse(resolver.isLongRunning(manifest.recipes[1]));

      assert.isNull(resolver.findLongRunningArcId(manifest.recipes[2]));
      assert.isFalse(resolver.isLongRunning(manifest.recipes[2]));

      assert.isNull(resolver.findLongRunningArcId(manifest.recipes[3]));
      assert.isFalse(resolver.isLongRunning(manifest.recipes[3]));

      assert.equal(resolver.findLongRunningArcId(manifest.recipes[4]), 'myLongRunningArc');
      assert.isTrue(resolver.isLongRunning(manifest.recipes[4]));
    });
    it('resolves mapping a handle from a long running arc into another long running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}
    // TODO(alxr): Resolve these types later
    // particle Writer
    //   data: writes Product Thing {name: Text, price: Number}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
      arcId writeArcId
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      for (const it of (await resolver.resolve())) {
        assert.isTrue(it.isResolved());
      }
    }));
    it('fails to resolve mapping a handle from a short running arc into another short running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(async () => await resolver.resolve(), Error, 'Handle data mapped to ephemeral handle thing.');
    }));
    it('fails to resolve mapping a handle from a short running arc into a long running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(async () => await resolver.resolve(), Error, 'Handle data mapped to ephemeral handle thing.');
    }));
    it('resolves mapping a handle from a long running arc into a short running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
      arcId writeArcId
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      for (const it of await resolver.resolve()) {
        assert.isTrue(it.isResolved());
      }
    }));
    it('Invalid Type: If Reader reads {name: Text, age: Number} it is not valid', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text, age: Number}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
      arcId writeArcId
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      // TODO: specify the correct error to be thrown
      await assertThrowsAsync(resolver.resolve);
    }));
    it('fails to resolve when a ingestion recipe has no arcId', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(async () => await resolver.resolve(), Error, 'Handle data mapped to ephemeral handle thing.');
    });
    it('fails to resolve when an ingestion recipe uses a create handle with no Id', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
      arcId writeArcId
    recipe WritingRecipe
      thing: create persistent
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);
      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(async () => await resolver.resolve(), Error, 'No matching handles found for data.');
    });
    it('fails to resolve recipes that have an ambiguous mapping to handles', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @trigger
      launch startup
      arcId writeArcId
    recipe WritingRecipe
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing
        
    @trigger
      launch startup
      arcId writeArcId2
    recipe WritingRecipe2
      thing: create persistent 'my-handle-id' 
      Writer
        data: writes thing

    @trigger
      launch startup
      arcId readArcId
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(async () => await resolver.resolve(), Error, 'More than one handle found for data.');
    });
    it.skip('No Handle: If there is no writing handle, it is not valid', () => {
    });
  });
});
