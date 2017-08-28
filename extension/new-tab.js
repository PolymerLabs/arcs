// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


// TODO(smalls) - there should be a better system of unique ids
var faux_gid = 2000;

/**
 * Load the current browsing data from all non-https tabs on all devices.
 */
async function loadBrowsingData(arc, manifest) {

  let entityDefinitions = {}
  for (let k of ['Answer', 'WebPage', 'Question', 'VideoObject']) {
    klass = manifest.findSchemaByName(k).entityClass();
    view = arc.createView(klass.type.viewOf(), k+'View');

    entityDefinitions[k] = {'klass': klass, 'view': view}
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
    dumpEntities(entityDefinitions, [].concat(...await Promise.all(tabs.map(tab => tabEntityMap.get(tab)))));
  }
}


function dumpEntities(entityDefinitions, entityData) {
  for (let ei of entityData) {
    let type = ei['@type'].replace(/http[s]?:\/\/schema.org\//, '');
    let ed = entityDefinitions[type];
    if (! type in entityDefinitions || ! ed) {
      console.log('missing type '+type+'; cant instantiate entity');
      continue;
    }

    let klass = ed['klass'];
    let view = ed['view'];

    let e = new klass(ei);
    e.id = faux_gid++;
    view.store(e);
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
