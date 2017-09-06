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
  //
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
  //
  let go = async ({db, urls}) => {
    // create default URL map
    let root = `https://polymerlabs.github.io/arcs-cdn/v0.0.4`;
    let urlMap = utils.createUrlMap(root);

    // we have an additional artifact that we need to load dynamically
    urlMap['worker-entry-cdn.js'] = `${root}/worker-entry-cdn.js`;
    // customize map
    urls && Object.assign(urlMap, urls);
    // start application
    app(urlMap, './new-tab.manifest', window['particle-container'], db);
  };
  //
  go(window);
}

async function loadBrowsingData(manifest) {

  let views = {}
  for (let k of ['Answer', 'WebPage', 'Question', 'VideoObject', 'Product']) {
    klass = manifest.findSchemaByName(k).entityClass();
    view = manifest.newView(klass.type.viewOf(), k+'View');

    views[k] = view;
  }

  let devices = await new Promise((resolve) => chrome.sessions.getDevices(null, resolve));
  let tabs = [];
  for (let device of devices) {
    for (let session of device.sessions) {
      for (let tab of session.window.tabs) {
        if (!/^https?/.test(tab.url)) {
          continue;
        }
        tabs.push({
          device: device.deviceName,
          group: session.window.sessionId,
          id: tab.sessionId,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
        });
      }
    }
  }
  let currentTabs = await new Promise((resolve) => chrome.tabs.query({}, resolve));
  for (let tab of currentTabs) {
    if (!/^https?/.test(tab.url)) {
      continue;
    }
    tabs.push({
      device: 'local',
      group: `local:${tab.windowId}`,
      url: tab.url,
      title: tab.title,
      id: tab.id,
      local: true,
    });
  }
  tabs.sort((a, b) => {
    return a.group.localeCompare(b.group);
  });
  let groupElement = null;
  let lastGroup = null;

  // Trigger entity extraction.
  let tabEntityMap = new Map();
  for (let tab of tabs) {
    tabEntityMap.set(tab, fetchEntities(tab));
  }

  let groupTabMap = new Map();
  for (let tab of tabs) {
    if (!groupTabMap.has(tab.group)) {
      groupTabMap.set(tab.group, []);
    }
    groupTabMap.get(tab.group).push(tab);
  }

  for (let [group, tabs] of groupTabMap) {
    dumpEntities(views, [].concat(...await Promise.all(tabs.map(tab => tabEntityMap.get(tab)))));
  }
}


function dumpEntities(views, entityData) {
  for (let ei of entityData) {
    let type = ei['@type'].replace(/http[s]?:\/\/schema.org\//, '');
    let view = views[type];
    if (! type in views || ! view) {
      console.log('missing type '+type+'; unable to instantiate entity');
      continue;
    }

    let data = Object.assign({}, ei);
    delete data['@type'];

    // TODO(smalls) - the view should generate these ids
    let id = faux_gid++;

    view.store({
      id,
      rawData: data
    });
  }
}

async function fetchEntities(tab) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(null, {
      method: 'extractEntities',
      args: [
        tab,
      ],
    }, null, resolve);
  });
}
