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
const Instantiator = require('../recipe/instantiator.js');
const Viewlet = require('../viewlet.js');
const Schema = require('../schema.js');

describe('manifest integration', () => {
  it('is integrated?', async () => {
    let registry = {};
    let loader = new Loader();
    let manifest = await Manifest.load('../particles/test/test.manifest', loader, registry);
    assert(manifest);
    let arc = new Arc({loader});
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(recipe.isResolved());
    Instantiator.instantiate(recipe, arc);
    await arc.pec.idle;
    let type = recipe.views[0].type;
    let [view] = arc.findViews(type);
    assert(view);
    let viewlet = Viewlet.viewletFor(view);
    // TODO: This should not be necessary.
    viewlet.entityClass = new Schema(type.schema).entityClass();
    let result = await viewlet.get();
    assert.equal(result.value, 'Hello, world!');
  });
});
