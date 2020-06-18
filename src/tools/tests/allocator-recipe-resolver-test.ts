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
  AllocatorRecipeResolver,
  AllocatorRecipeResolverError
} from '../allocator-recipe-resolver.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {Flags} from '../../runtime/flags.js';
import {DriverFactory} from '../../runtime/storageNG/drivers/driver-factory.js';
import {VolatileStorageKey} from '../../runtime/storageNG/drivers/volatile.js';

const randomSalt = 'random_salt';

describe('recipe2plan', () => {
  describe('allocator-recipe-resolver', () => {
    afterEach(() => DriverFactory.clearRegistrationsForTesting());
    it('detects long running arc', async () => {
      const manifest = (await Manifest.parse(`
          recipe Zero
          @arcId('myLongRunningArc')
          recipe One
      `));
      assert.lengthOf(manifest.recipes, 2);
      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
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
      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
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
        const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
        await assertThrowsAsync(
          async () => await resolver.resolve(),
          AllocatorRecipeResolverError,
          'No matching handles found for data.'
        );
    });
    it('fails to resolve when user maps to a volatile create handle', Flags.withDefaultReferenceMode(async () => {
      VolatileStorageKey.register();
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

      const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
      await assertThrowsAsync(
        async () => await resolver.resolve(),
        AllocatorRecipeResolverError,
        `Recipe ReadingRecipe failed to resolve:
cannot find associated store with handle id 'my-handle-id'
Resolver generated 0 recipes`
      );
    }));
  });
  it('resolves joining mapped handles and reading tuples of data', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Writer
    products: writes [Product {name: Text}]
    manufacturers: writes [Manufacturer {address: Text}]

  particle Reader
    data: reads [(
      &Product {name: Text},
      &Manufacturer {address: Text}
    )]

  @arcId('write-data-for-join')
  recipe WriteData
    products: create 'products' @persistent
    manufacturers: create 'manufacturers' @persistent
    Writer
      products: products
      manufacturers: manufacturers

  recipe ReadJoin
    products: map 'products'
    manufacturers: map 'manufacturers'
    data: join (products, manufacturers)
  
    Reader
      data: data`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    for (const it of (await resolver.resolve())) {
      assert.isTrue(it.isResolved());
    }
  }));
  it('assigns creatable storage keys', Flags.withDefaultReferenceMode(async () => {
    const manifest = await Manifest.parse(`\
  particle Reader
    data: reads Thing {name: Text}

  particle Writer
     data: writes Thing {name: Text}
  
  recipe
    thing: create
    Writer
      data: thing
    Reader
      data: thing`);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const [recipe] = await resolver.resolve();
    assert.equal(
      recipe.handles[0].storageKey.toString(),
      'create://67835270998a62139f8b366f1cb545fb9b72a90b'
    );
  }));
  it('creates a creatable storage keys with hadle capabilities', async () => {
    const manifest = await Manifest.parse(`
   particle A
     data: writes Thing {num: Number}
     
   recipe R
     h0: create @persistent
     h1: create #test
     h2: create #test2 @tiedToArc @queryable
     h3: create #test2 @tiedToRuntime @queryable
     h4: create #test2 @queryable
     h5: create #test2 @ttl('1d')
     A
       data: writes h0
     A
       data: writes h1
     A
       data: writes h2
     A
       data: writes h3
     A
       data: writes h4
     A
       data: writes h5
    `);

    const resolver = new AllocatorRecipeResolver(manifest, randomSalt);
    const [recipe] = await resolver.resolve();

    assert.isTrue(recipe.handles.every(h => h.storageKey.protocol === 'create'));
    assert.deepEqual(recipe.handles.map(h => h.annotations.map(a => a.toString())), [
      ['@persistent'],
      [],
      ['@tiedToArc', '@queryable'],
      ['@tiedToRuntime', '@queryable'],
      ['@queryable'],
      ['@ttl(value: \'1d\')']
    ]);
  });
});
