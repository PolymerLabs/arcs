/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {RecipeResolver} from '../recipe/recipe-resolver.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {StubLoader} from '../testing/stub-loader.js';
import {Id, ArcId} from '../id.js';

describe('RecipeResolver', () => {
  const buildManifest = async (content) => {
    const registry = {};
    const loader = new StubLoader(content);
    return await Manifest.load('manifest', loader, {registry});
  };

  const createArc = (manifest) => new Arc({id: ArcId.newForTest('test'), slotComposer: new FakeSlotComposer(), loader: new Loader(), context: manifest});

  it('resolves a recipe', async () => {
    const manifest = await buildManifest({
      manifest: `
      particle P in 'A.js'
        root: consumes Slot
        modality dom

      recipe
        P
        `
    });
    const recipe = manifest.recipes[0];
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);

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
    // The recipe below is unresolvable as it's missing an
    // output handle connection.
    const manifest = await buildManifest({
      manifest: `
      particle P in 'A.js'
        text: writes * {value: Text}
        root: consumes Slot
        modality dom

      recipe
        P
        `
    });
    const recipe = manifest.recipes[0];
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    const result = await resolver.resolve(recipe);
    assert.isFalse(result.isResolved());
  });

  it('returns null for an invalid recipe', async () => {
    // The recipe below is invalid as it's  missing consume and modality.
    const manifest = await buildManifest({
      manifest: `
      particle P in 'A.js'

      recipe
        P
        `
    });
    const recipe = manifest.recipes[0];
    const arc = createArc(manifest);
    const resolver = new RecipeResolver(arc);
    assert.isNull(await resolver.resolve(recipe));
  });
});
