/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../arc.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Manifest} from '../manifest.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';

import {assert} from './chai-web.js';

describe('RecipeResolver', function() {
  const buildRecipe = async (content) => {
    let registry = {};
    let loader = new StubLoader(content);
    let manifest = await Manifest.load('manifest', loader, {registry});
    return manifest.recipes[0];
  };

  const createArc = () => {
    return new Arc({
      id: 'test',
      slotComposer: {
        affordance: 'dom',
        getAvailableSlots: (() => {
          return [{
            name: 'root',
            id: 'r0',
            tags: ['#root'],
            handles: [],
            handleConnections: [],
            getProvidedSlotSpec: () => {
              return {isSet: false};
            }
          }];
        })
      }
    });
  };

  it('resolves a recipe', async () => {
    const arc = createArc();
    const resolver = new RecipeResolver(arc);
    const recipe = await buildRecipe({
      manifest: `
      particle P in 'A.js'
        consume root
        affordance dom

      recipe
        P
        `
    });
    // Initially the recipe should not be normalized (after which it's srozen).
    assert.isFalse(Object.isFrozen(recipe));
    const result = await resolver.resolve(recipe);
    // The original recipe should remain untouched and the new instance
    // should have been normalized.
    assert.isFalse(Object.isFrozen(recipe));
    assert.isTrue(Object.isFrozen(result));
    assert.isTrue(result.isResolved());
  });

  it('returns an unresolvable recipe as unresolved', async () => {
    const arc = createArc();
    const resolver = new RecipeResolver(arc);
    // The recipe below is unresolvable as it's missing an
    // output handle connection.
    const recipe = await buildRecipe({
      manifest: `
      particle P in 'A.js'
        out * {Text value} text
        consume root
        affordance dom

      recipe
        P
        `
    });
    const result = await resolver.resolve(recipe);
    assert.isFalse(result.isResolved());
  });

  it('returns null for an invalid recipe', async () => {
    const arc = createArc();
    const resolver = new RecipeResolver(arc);
    // The recipe below is invalid as it's  missing consume and affordance.
    const recipe = await buildRecipe({
      manifest: `
      particle P in 'A.js'

      recipe
        P
        `
    });
    assert.isNull(await resolver.resolve(recipe));
  });
});
