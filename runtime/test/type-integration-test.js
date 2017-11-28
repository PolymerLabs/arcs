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

const assert = require('chai').assert;
const Arc = require("../arc.js");
const Loader = require("../loader.js");
const Manifest = require('../manifest.js');
const Schema = require('../schema.js');

async function setup() {
  let registry = {};
  let loader = new Loader();
  let manifest = await Manifest.load('../particles/test/type-match.manifest', loader, registry);
  assert(manifest);

  return manifest
}

describe('type integration', () => {
  it('a subtype matches to a supertype that wants to be read', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.views.length == 1);
    assert(recipe.views[0].type.primitiveType().entitySchema.name == 'Lego')
  });

  it('a subtype matches to a supertype that wants to be read when a view exists', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[1];
    recipe.views[0].mapToView({id: 'test1', type: manifest.findSchemaByName('Product').entityClass().type.setViewOf()});
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.views.length == 1);
    assert(recipe.views[0].type.primitiveType().entitySchema.name == 'Product')
  });

  it('a subtype matches to a supertype that wants to be read when a view exists', async () => {
    let manifest = await setup();

    let recipe = manifest.recipes[1];
    recipe.views[0].mapToView({id: 'test1', type: manifest.findSchemaByName('Lego').entityClass().type.setViewOf()});
    assert(recipe.normalize());
    assert(recipe.isResolved());
    assert(recipe.views.length == 1);
    assert(recipe.views[0].type.primitiveType().entitySchema.name == 'Lego')
  });
});
