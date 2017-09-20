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
  console.log('response', response);

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
  console.log('changeInfo', changeInfo.status);
  if (changeInfo.status && 'complete'==changeInfo.status) {
    chrome.tabs.sendMessage(tabId, {method: "extractEntities"}, response => {
      updateBadge(tabId, response);
    });
  } else {
    // clear out our flair
    updateBadge(tabId, null);
  }
});

/*
 * This is another entry point to tab changes, but it's not currently needed -
 * by associating our text with tabs in updateBadge() we remove the need to
 * update state as the user changes tabs.
 *
 * TODO(smalls) - remove me.
 *
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.sendMessage(activeInfo.tabId, {method: "extractEntities"}, response => {
    updateBadge(activeInfo.tabId, response);
  });
});
*/
