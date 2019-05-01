/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Loader} from '../../../runtime/loader.js';
import {Arc} from '../../../runtime/arc.js';
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {ArcId} from '../../../runtime/id.js';

describe('common particles test', () => {
  it.only('resolves after cloning', async () => {
    const loader = new Loader();
    const manifest = await Manifest.load(`particles/TicTacToe/MoveApplier.manifest`, loader);
    console.log('>>>>> ', manifest.toString());
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved(), recipe.toString({showUnresolved: true}));
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    arc.instantiate(recipe);
  });
});