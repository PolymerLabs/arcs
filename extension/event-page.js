// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let pageExtractorCallbacks = {};

function handlePageEntities(sender, result) {
  let callbacks = pageExtractorCallbacks[sender.tab.id];
  if (!callbacks) {
    return;
  }
  delete pageExtractorCallbacks[sender.tab.id];
  if (result) {
    callbacks.resolve(result);
  } else {
    callbacks.reject();
  }
}

async function localExtractEntities(tab) {
  return new Promise((resolve, reject) => {
    pageExtractorCallbacks[tab.id] = {resolve, reject};
    chrome.tabs.executeScript(tab.id, {file: 'page-extractor.js'}, result => {
      if (chrome.runtime.lastError) {
        // Can't access chrome: or other extension pages.
        delete pageExtractorCallbacks[tab.id];
        reject();
      }
    });
  });
}

async function remoteExtractEntities(tab) {
  return {todo: `Use remote service to describe ${tab.url}`};
}

async function extractEntities(tab) {
  try {
    if (tab.local) {
      return await localExtractEntities(tab);
    } else {
      return await remoteExtractEntities(tab);
    }
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.method == 'extractEntities') {
    extractEntities(...request.args).then(x => sendResponse(x));
    return true;
  }
  if (request.method == 'handlePageEntities') {
    handlePageEntities(sender, ...request.args);
  }
});
