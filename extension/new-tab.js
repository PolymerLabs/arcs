// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

(async () => {
  let devices = await new Promise((resolve) => chrome.sessions.getDevices(null, resolve));
  let tabs = [];
  for (let device of devices) {
    for (let session of device.sessions) {
      for (let tab of session.window.tabs) {
        tabs.push({
          device: device.deviceName,
          group: session.window.sessionId,
          id: tab.sessionId,
          url: tab.url,
          title: tab.title,
        });
      }
    }
  }
  let currentTabs = await new Promise((resolve) => chrome.tabs.query({}, resolve));
  for (let tab of currentTabs) {
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
  // TODO: Polymer.
  for (let tab of tabs) {
    if (tab.group != lastGroup) {
      let title = `${tab.device} / ${tab.group}`;
      document.body.appendChild(groupElement = document.createElement('div'));
      groupElement.style.whiteSpace = 'pre';
      groupElement.style.fontFamily = 'monospace';
      groupElement.style.margin = '5px';
      groupElement.style.padding = '5px';
      groupElement.style.border = 'solid silver 1px';
      lastGroup = tab.group;
      groupElement.appendChild(document.createTextNode(`${title}\n`));
      groupElement.appendChild(document.createTextNode(`${title.replace(/./g, '=')}\n`));
    }
    let entities = await fetchEntities(tab);
    groupElement.appendChild(document.createTextNode(`${tab.title}\n`));
    groupElement.appendChild(document.createTextNode('  ' + JSON.stringify(entities) + '\n\n'));
  }
})();

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
