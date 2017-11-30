/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

"use strict";

import {assert} from './chai-web.js';
import Arc from "../arc.js";
import Loader from "../loader.js";
import Manifest from '../manifest.js';
import handle from '../handle.js';
import Schema from '../schema.js';
import Speculator from '../speculator.js';

async function setup() {
  let registry = {};
  let loader = new Loader();
  let manifest = await Manifest.load('./particles/test/test.manifest', loader, registry);
  assert(manifest);
  let arc = new Arc({});
  let recipe = manifest.recipes[0];
  assert(recipe.normalize());
  assert(recipe.isResolved());
  return {arc, recipe}
}

describe('manifest integration', () => {
  it('can produce a recipe that can be instantiated in an arc', async () => {
    let {arc, recipe} = await setup();
    arc.instantiate(recipe);
    await arc.pec.idle;
    let type = recipe.views[0].type;
    let [view] = arc.findViewsByType(type);
    assert(view);
    let theHandle = handle.handleFor(view);
    // TODO: This should not be necessary.
    theHandle.entityClass = type.entitySchema.entityClass();
    let result = await theHandle.get();
    assert.equal(result.value, 'Hello, world!');
  });
  it('can produce a recipe that can be speculated', async () => {
    let {arc, recipe} = await setup();
    let relevance = await new Speculator().speculate(arc, recipe);
    assert.equal(relevance.calcRelevanceScore(), 1);
  });
});
