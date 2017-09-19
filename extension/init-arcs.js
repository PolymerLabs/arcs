// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * Create an arc.
 */
async function create_arc(urlMap, manifestPath, container) {
  // create a system loader
  // TODO(sjmiles): `pecFactory` can create loader objects (via worker-entry*.js) for the innerPEC,
  // but we have to create one by hand for manifest loading
  let loader = new Arcs.BrowserLoader(urlMap);
  // load manifest
  let manifest = await Arcs.Manifest.load(manifestPath, loader);
  // TODO(sjmiles): hack in ability to utilize imported recipes
  utils.collapseRecipes(manifest);
  console.log(manifest);
  // renderer
  let slotComposer = new Arcs.SlotComposer({rootContext: container, affordance: "dom"});
  // an Arc!
  let arc = Arcs.utils.createArc({id: 'demo', urlMap, slotComposer, context: manifest});
  // load our dynamic data
  await loadBrowsingData(manifest);

  return arc;
};
