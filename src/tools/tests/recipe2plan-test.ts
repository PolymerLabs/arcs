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
import {StorageKeyRecipeResolver} from '../recipe2plan.js';
import {assert} from '../../platform/chai-node.js';
import {assertThrowsAsync} from '../../testing/test-util.js';

describe('recipe2plan', () => {
  it('Long + Long: If ReadingRecipe is long running, it is a valid use case', async () => {
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
    // @ts-ignore
    for await (const it of resolver.resolve()) {
      assert.isTrue(it.isResolved());
    }
  });
  it('Short + Short: If WritingRecipe is short lived, it is not valid', async () => {
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
    await assertThrowsAsync(async () => {
      // @ts-ignore
      for await (const it of resolver.resolve()) {
        continue;
      }
    });
  });
  it('Short + Long: If WritingRecipe is short lived and Reading is long lived, it is not valid', async () => {
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

    await assertThrowsAsync(async () => {
      const resolver = new StorageKeyRecipeResolver(manifest);
      // @ts-ignore
      for await (const it of resolver.resolve()) {
        continue;
      }
    });
  });
  it.skip('Invalid Type: If Reader reads {name: Text, age: Number} it is not valid', () => {});
  it.skip('No arc id: If arcId of WritingRecipe is not there, it is not valid', () => {});
  it.skip('No handleId: If id of handle in WritingRecipe is not provided, it is not valid', () => {});
  it.skip('Ambiguous handle: If there are 2 WritingRecipes creating the same handle, it is not valid', () => {});
  it.skip('Ambiguous handle + tag disambiguation: If there are 2 WritingRecipes creating the same handle but with different tags and mapping uses one of the tags, it is valid', () => {});
  it.skip('No Handle: If there is no writing handle, it is not valid', () => {});
});
