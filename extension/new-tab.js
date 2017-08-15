// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * Load the current browsing data from all non-https tabs on all devices; output is
 * piped out through detailPrint().
 */
(async () => {

  if (typeof(Storage) === "undefined") {
    alert('this should be a better error message');
    return;
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
    dumpEntities([].concat(...await Promise.all(tabs.map(tab => tabEntityMap.get(tab)))));
  }

})();


function dumpEntities(entities) {

  let store = sessionStorage.arcs ? JSON.parse(sessionStorage.arcs) : new Map();

  for (let entity of entities) {
    let type = entity['@type'] || 'unknown';
    if (!store[type]) {
      store[type] = [];
    }
    store[type].push(entity);

    if (!window.db.model.Url) {
      window.db.model.Url = []
    }
    window.db.model.Url.push(entity);
  }

  // Based on my reading of this file the whole thing is async, but processed
  // in a single thread.
  // However, this is not thread-safe, so if that changes we'll need to lock
  // dumpEntities().
  // Another option would be to qualify the keys - maybe 'arcs.'+type.
  sessionStorage.arcs = JSON.stringify(store);
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
