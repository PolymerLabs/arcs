// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/* global chrome, _prepareResults */

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('event page received message ' + request.method, request);
  if (request.method == 'loadAllEntities') {
    loadEntitiesFromTabs().then(results => {
      console.log(
          'event page finished loading entities from all tabs', results);
      const response = _prepareResults(results);
      console.log('event page prepared response', response);
      sendResponse(response);
    });

    return true;
  }
});

/**
 * Load schema.org entities from all available tabs.
 * Previous versions of this method (in new-tab.js) queried across devices,
 * but I've removed that for simplicity.
 */
async function loadEntitiesFromTabs() {
  let tabs = [];
  let currentTabs =
      await new Promise(resolve => chrome.tabs.query({}, resolve));
  for (let tab of currentTabs) {
    if (!/^https?/.test(tab.url)) {
      continue;
    }
    tabs.push({
      url: tab.url,
      title: tab.title,
      id: tab.id,
    });
  }

  // Trigger entity extraction.
  let tabEntityMap = new Map();
  for (let tab of tabs) {
    tabEntityMap.set(tab, loadEntitiesFromTab(tab));
  }

  return Promise.all(tabs.map(tab => tabEntityMap.get(tab)));
}

async function loadEntitiesFromTab(tab) {
  return new Promise(
      resolve =>
          chrome.tabs.sendMessage(tab.id, {method: 'loadEntities'}, result => {
            resolve({tab: tab, result: result});
          }));
}
