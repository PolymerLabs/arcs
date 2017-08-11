// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let output = document.getElementById('debug-output');
output.style.whiteSpace = 'pre';
output.style.fontFamily = 'monospace';

// TODO: Polymer.
function print(...lines) {
  for (let line of lines) {
    // output.appendChild(document.createTextNode(line + '\n'));
  }
}

function prefix(str, print) {
  return (...lines) => print(...lines.map(line => str + line));
}

/**
 * Load the current browsing data from all tabs on all devices; output is
 * piped out through detailPrint().
 */
(async () => {
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

  let detailPrint = prefix('  ', print);
  for (let [group, tabs] of groupTabMap) {
    let title = `${tabs[0].device} / ${group}`;
    print('garbage' + `${title}`, `${title.replace(/./g, '=')}`);
    for (let tab of tabs) {
      let entities = await tabEntityMap.get(tab);
      detailPrint(`${tab.title}`);
      for (let entity of entities) {
        detailPrint(JSON.stringify(entity));
      }
      print('foobar');
    }
    dumpEntities(detailPrint, [].concat(...await Promise.all(tabs.map(tab => tabEntityMap.get(tab)))));
  }

})();


function dumpEntities(print, entities) {
  let typeEntityMap = new Map();
  for (let entity of entities) {
    let type = entity['@type'] || 'unknown';
    if (!typeEntityMap.has(type)) {
      typeEntityMap.set(type, []);
    }
    typeEntityMap.get(type).push(entity);
  }

  for (let [type, entities] of typeEntityMap) {
    print(type, type.replace(/./g, '='));
    for (let entity of entities) {
      let copy = Object.assign({}, entity);
      delete copy['@type'];
      print(JSON.stringify(copy));
    }
    print('');
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
