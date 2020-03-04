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

describe('recipe2plan', () => {
  describe('storage-key-recipe-resolver', () => {
    it('resolves mapping a handle from a long running arc into another long running arc', async () => {
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
    });
    it('fails to resolve mapping a handle from a short running arc into another short running arc', async () => {
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
    });
    it('fails to resolve mapping a handle from a short running arc into a long running arc', async () => {
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
    });
    it('resolves mapping a handle from a long running arc into a short running arc', async () => {
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
    });
    it('Invalid Type: If Reader reads {name: Text, age: Number} it is not valid', async () => {
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
    });
    // TODO(alxr): Flush out outlined unit tests
    it.skip('No arc id: If arcId of WritingRecipe is not there, it is not valid', () => {
    });
    it.skip('No handleId: If id of handle in WritingRecipe is not provided, it is not valid', () => {
    });
    it.skip('Ambiguous handle: If there are 2 WritingRecipes creating the same handle, it is not valid', () => {
    });
    it.skip('Ambiguous handle + tag disambiguation: If there are 2 WritingRecipes creating the same handle but with different tags and mapping uses one of the tags, it is valid', () => {
    });
    it.skip('No Handle: If there is no writing handle, it is not valid', () => {
    });
  });
});
