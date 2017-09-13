// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


// TODO(smalls) - there should be a better system of unique ids
var faux_gid = 2000;

function instantiate_arcs(doc) {
  let template = doc.document.querySelector('template').content;
  doc.document.body.appendChild(doc.document.importNode(template, true));

  
  let app = async function(urlMap, manifestPath, container, db) {
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
    // generate suggestions
    Arcs.utils.suggest(arc, doc.document.querySelector('suggestions-element'));
  };
  
  let go = async ({db, urls}) => {
    // create default URL map
    let root = chrome.extension.getURL('newtab.js').split('/').slice(0,3).join('/') +
      `/resources/arcs-cdn`;
    let urlMap = utils.createUrlMap(root);

    // we have an additional artifact that we need to load dynamically
    urlMap['worker-entry-cdn.js'] = `${root}/lib/worker-entry-cdn.js`;
    // customize map
    urls && Object.assign(urlMap, urls);
    // start application
    app(urlMap, './new-tab.manifest', window['particle-container'], db);
  };
  
  go(window);
}

