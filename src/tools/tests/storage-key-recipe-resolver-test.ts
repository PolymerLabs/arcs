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
import {
  findLongRunningArcId,
  isLongRunning,
  StorageKeyRecipeResolver,
  StorageKeyRecipeResolverError
} from '../storage-key-recipe-resolver.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {DatabaseStorageKey} from '../../runtime/storageNG/database-storage-key.js';
import {CapabilitiesResolver} from '../../runtime/capabilities-resolver.js';
import {Flags} from '../../runtime/flags.js';
import {DriverFactory} from '../../runtime/storageNG/drivers/driver-factory.js';
import {VolatileStorageKey} from '../../runtime/storageNG/drivers/volatile.js';

describe('recipe2plan', () => {
  describe('storage-key-recipe-resolver', () => {
    afterEach(() => DriverFactory.clearRegistrationsForTesting());
    it('detects long running arc', async () => {
      const manifest = (await Manifest.parse(`
          recipe Zero
          @arcId('myLongRunningArc')
          recipe One
      `));
      assert.lengthOf(manifest.recipes, 2);
      const resolver = new StorageKeyRecipeResolver(manifest);
      assert.isFalse(isLongRunning(manifest.recipes[0]));
      assert.isNull(findLongRunningArcId(manifest.recipes[0]));
      assert.equal(findLongRunningArcId(manifest.recipes[1]), 'myLongRunningArc');
      assert.isTrue(isLongRunning(manifest.recipes[1]));
    });
    it('resolves mapping a handle from a long running arc into another long running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}
    particle Writer
      data: writes Thing {name: Text}

    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
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
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        `Handle data mapped to ephemeral handle 'my-handle-id'.`
      );
    }));
    it('fails to resolve mapping a handle from a short running arc into a long running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        `Handle data mapped to ephemeral handle 'my-handle-id'.`
      );
    }));
    it('resolves mapping a handle from a long running arc into a short running arc', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      const recipes = await resolver.resolve();
      for (const it of recipes) {
        assert.isTrue(it.isResolved());
      }
    }));
    it('fails if the type read is broader than the type written', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text, age: Number}

    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      // TODO: specify the correct error to be thrown
      await assertThrowsAsync(resolver.resolve);
    }));
    it('resolves if the type written is be broader than type read', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Writer
      data: writes Product Thing {name: Text, price: Number}
    particle Reader
      data: reads Thing {name: Text}

    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      for (const it of (await resolver.resolve())) {
        assert.isTrue(it.isResolved());
      }
    }));
    it('fails to resolve when a ingestion recipe has no arcId', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        `Handle data mapped to ephemeral handle 'my-handle-id'.`
      );
    });
    it('fails to resolve when an ingestion recipe uses a create handle with no Id', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);
      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        'No matching handles found for data.'
      );
    });
    it('fails to resolve recipes that have an ambiguous mapping to handles', async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing
        
    @arcId('writeArcId2')
    recipe WritingRecipe2
      thing: create 'my-handle-id' @persistent
      Writer
        data: writes thing

    @arcId('readArcId')
    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        'More than one handle found for data.'
      );
    });
    it('does not create storage keys for create handles with no IDs', async () => {
      const manifest = await Manifest.parse(`\
    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      thing2: create @persistent
      Writer
        data: writes thing
      Writer
        data: writes thing2`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await resolver.resolve();
      assert.deepStrictEqual(manifest.stores.map(s => s.id), ['my-handle-id']);
    });
    it('resolves queryable create handles', async () => {
      const manifest = await Manifest.parse(`\
    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent @queryable
      Writer
        data: writes thing`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      for (const it of (await resolver.resolve())) {
        assert.isTrue(it.isResolved());
      }
    });
    it('resolves writes of collections of entities', async () => {
      const manifest = await Manifest.parse(`\
    particle Writer
       data: writes [Thing {name: Text}]
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' @persistent
      Writer
        data: thing`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      for (const it of (await resolver.resolve())) {
        assert.isTrue(it.isResolved());
      }
    });
    it('fails if there is no matching writing handle found', async () => {
      const manifest = await Manifest.parse(`\
      particle Reader
        data: reads Thing {name: Text}
  
      recipe ReadingRecipe
        data: map 'my-handle-id'
        Reader
          data: reads data`);
        const resolver = new StorageKeyRecipeResolver(manifest);
        await assertThrowsAsync(
          async () => await resolver.resolve(),
          StorageKeyRecipeResolverError,
          'No matching handles found for data.'
        );
    });
    it('fails to resolve when user maps to a volatile create handle', Flags.withDefaultReferenceMode(async () => {
      const manifest = await Manifest.parse(`\
    particle Reader
      data: reads Thing {name: Text}

    particle Writer
       data: writes Thing {name: Text}
    
    @arcId('writeArcId')
    recipe WritingRecipe
      thing: create 'my-handle-id' 
      Writer
        data: writes thing

    recipe ReadingRecipe
      data: map 'my-handle-id'
      Reader
        data: reads data`);

      const resolver = new StorageKeyRecipeResolver(manifest);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        StorageKeyRecipeResolverError,
        `Recipe ReadingRecipe failed to resolve:
cannot find associated store with handle id 'my-handle-id'
Resolver generated 0 recipes`
      );
    }));
  });
});
