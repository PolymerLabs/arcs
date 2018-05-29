/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from './chai-web.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';

async function setup() {
  let registry = {};
  let loader = new Loader();
  let manifest = await Manifest.load('./runtime/test/artifacts/type-match.manifest', loader, registry);
  assert(manifest);

  return manifest;
}

describe('type integration', () => {
  it('a subtype matches to a supertype that wants to be read', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.handles.length == 1);
    assert(recipe.handles[0].type.primitiveType().canReadSubset.entitySchema.name == 'Lego');
    assert(recipe.handles[0].type.primitiveType().canWriteSuperset.entitySchema.name == 'Product');
  });

  it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[1];
    recipe.handles[0].mapToStorage({id: 'test1', type: manifest.findSchemaByName('Product').entityClass().type.collectionOf()});
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.handles.length == 1);
    assert(recipe.handles[0].type.primitiveType().entitySchema.name == 'Product');
  });

  it('a subtype matches to a supertype that wants to be read when a handle exists', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[1];
    recipe.handles[0].mapToStorage({id: 'test1', type: manifest.findSchemaByName('Lego').entityClass().type.collectionOf()});
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.handles.length == 1);
    assert(recipe.handles[0].type.primitiveType().entitySchema.name == 'Lego');
  });
});
