// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("event page received message " + request.method, request);
  if (request.method == "storePageEntities") {
    let key = request.url;
    chrome.storage.local.set({ [request.url]: request.results }, () => {
      if (chrome.runtime.lastError) {
        console.log("ERROR failed to store: " + chrome.runtime.lastError);
      }
    });

    // TODO(smalls) remove this, it's only for debugging
    chrome.storage.local.get(null, result => {
      console.log("after store completed, storage contains", result);
    });
  } else if (request.method == "loadAllEntities") {
    chrome.storage.local.get(null, result => {
      if (chrome.runtime.lastError) {
        console.log("ERROR retrieving storage: " + chrome.runtime.lastError);
        return;
      }

      sendResponse(result);
    });
    return true;
  }
});
