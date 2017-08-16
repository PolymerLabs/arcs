/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Arc = require("../../arc.js");
const Manifest = require("../../manifest.js");

async function prepareDemoContext({loader, pecFactory, slotComposer}) {
  let manifest = await Manifest.load('browser/vr-demo/recipes.manifest', loader);

  let arc = new Arc({id: 'demo', pecFactory, slotComposer});
  let recipes = manifest.recipes;

  let context = {
    arc,
    recipes,
    // TODO: Remove this. Only needed for the findParticleByName strategy.
    particleFinder: manifest,
  };

  return {relatedArcs: [], arc, context};
}

module.exports = prepareDemoContext;
