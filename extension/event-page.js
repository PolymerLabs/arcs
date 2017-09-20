// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

async function localExtractEntities(tab) {
  return new Promise((resolve, reject) => {
    chrome.tabs.executeScript(tab.id, {file: 'page-extractor.js'}, result => {
      if (chrome.runtime.lastError) {
        // Can't access chrome: or other extension pages.
        reject(chrome.runtime.lastError);
      } else {
        chrome.tabs.sendMessage(tab.id, {method: 'extractEntities', args: []}, null, resolve);
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        }
      }
    });
  });
}

async function remoteExtractEntities(tab) {
  let pageEntity = {
    '@type': 'http://schema.org/WebPage',
    url: tab.url,
  };
  if (tab.title) {
    pageEntity.name = tab.title;
  }
  if (tab.favIconUrl) {
    pageEntity.image = tab.favIconUrl;
  }
  return [pageEntity];
}

async function extractEntities(tab) {
  try {
    if (tab.local) {
      return await localExtractEntities(tab);
    } else {
      return await remoteExtractEntities(tab);
    }
  } catch (e) {
    console.error(e);
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method == 'extractEntities') {
    extractEntities(...request.args).then(x => sendResponse(x));
    return true;
  }
});



function updateBadge(tabId, response) {
  
  // TODO(smalls) - currently, we're using the presence of entities from the
  // page as a proxy for an interesting arc being available. In the future we
  // should run the suggestinator for a more comprehensive view.

  chrome.browserAction.setBadgeBackgroundColor({
    color: response ? '#aedfff' : [0,0,0,0],
    tabId: tabId
  });
  chrome.browserAction.setBadgeText({
    text: response ? 'arc' : '',
    tabId: tabId
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  
  if (changeInfo.status && 'complete'==changeInfo.status) {
    chrome.tabs.sendMessage(tabId, {method: "extractEntities"}, response => {
      updateBadge(tabId, response);
    });
  } else {
    // clear out our flair
    updateBadge(tabId, null);
  }
});
