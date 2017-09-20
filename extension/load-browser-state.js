// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


/**
 * Load the current browser state into the specified manifest.
 */
async function loadBrowsingData(manifest, dataLoader) {

  let views = {}
  for (let k of ['Answer', 'WebPage', 'Question', 'VideoObject', 'Product']) {
    klass = manifest.findSchemaByName(k).entityClass();
    view = manifest.newView(klass.type.viewOf(), k+'View');

    views[k] = view;
  }

  let entities = await dataLoader();
  console.log('data from browser', entities);

  dumpEntities(views, entities);
}

// XXX move to new-tab.js?
async function load_entities_from_tabs() {

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

  return [].concat(...await Promise.all(tabs.map(tab => tabEntityMap.get(tab))));
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
