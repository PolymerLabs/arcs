// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * Transform the results from our internal format (list of
 *   [{tab: tabInfo, results: [entities]}]
 * into the format expect by callers, namely a map
 *   {url: [entities]}
 * Also trims out any empty results (urls without entities, for instance).
 */
function _prepareResults(results) {
  return results.reduce( (accumulator, currentValue) => {
    let value = currentValue['result'];
    if (value) {
      let key = currentValue['tab']['url'];
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('event page received message ' + request.method, request);
  /*if (request.method == 'storePageEntities') {
    let key = request.url;
    chrome.storage.local.set({ [request.url]: request.results }, () => {
      if (chrome.runtime.lastError) {
        console.log('ERROR failed to store: ' + chrome.runtime.lastError);
      }
    });

    // TODO(smalls) remove this, it's only for debugging
    chrome.storage.local.get(null, result => {
      console.log('after store completed, storage contains', result);
    });
  } else */ if (request.method == 'loadAllEntities') {
    /*
    chrome.storage.local.get(null, result => {
      if (chrome.runtime.lastError) {
        console.log('ERROR retrieving storage: ' + chrome.runtime.lastError);
        return;
      }

      sendResponse(result);
    });
    */
    loadEntitiesFromTabs().then(results => {
      console.log('got result from all tabs', results);
      sendResponse(_prepareResults(results));
    });

    return true;
  }
});

/**
 * Load schema.org entities from all available tabs.
 * Previous versions of this method (in new-tab.js) queried across devices,
 * but I've removed that for simplicity in this version.
 */
async function loadEntitiesFromTabs() {
  /*
  let devices = await new Promise(resolve =>
    chrome.sessions.getDevices(null, resolve)
  );
  */
  let tabs = [];
  /*
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
          favIconUrl: tab.favIconUrl
        });
      }
    }
  }
  */
  let currentTabs = await new Promise(resolve =>
    chrome.tabs.query({}, resolve)
  );
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
      local: true
    });
  }
  tabs.sort((a, b) => {
    return a.group.localeCompare(b.group);
  });
  /*
  let groupElement = null;
  let lastGroup = null;
  */

  // Trigger entity extraction.
  let tabEntityMap = new Map();
  for (let tab of tabs) {
    tabEntityMap.set(tab, loadEntitiesFromTab(tab));
  }

  return Promise.all(tabs.map(tab => tabEntityMap.get(tab)));

  /*
  let groupTabMap = new Map();
  for (let tab of tabs) {
    if (!groupTabMap.has(tab.group)) {
      groupTabMap.set(tab.group, []);
    }
    groupTabMap.get(tab.group).push(tab);
  }

  return [].concat(
    ...(await Promise.all(tabs.map(tab => tabEntityMap.get(tab))))
  );
  */
}

async function loadEntitiesFromTab(tab) {
  return new Promise(resolve => 
    chrome.tabs.sendMessage(tab.id, {'method': 'loadEntities'}, result => {
      console.log('hey!! got result', result);
      resolve({tab: tab, result: result});
    })
  );
}
