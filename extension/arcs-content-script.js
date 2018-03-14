// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/* global chrome, extractEntities */

// TODO(smalls) there should be a better way to detect an arcs page we can
// inject data into.
const isExtensionAppShellPage =
    document.body.getElementsByTagName('app-shell').length > 0;

if (isExtensionAppShellPage) {
  // Listen for requests to send entities.
  window.addEventListener('message', event => {
    console.log(
        'arcs-page content script received event ' + event.data.method,
        event.data);
    if (event.source != window || event.data.method != 'pleaseInjectArcsData') {
      return;
    }

    chrome.runtime.sendMessage({method: 'loadAllEntities'}, entities => {
      console.log(
          'arcs-extension content script received entities from extension; forwarding to extension-app-shell for injection',
          entities);
      window.postMessage({method: 'injectArcsData', entities: entities}, '*');
    });
  });
} else {
  // Listen for requests from the event page
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(
        'arcs-other content script received message ' + request, request);
    if (request.method == 'loadEntities') {
      extractEntities(document, window.location).then(results => {
        console.log('arcs-other content script sending response', results);
        sendResponse(results);
      });

      // we'll send a response async, once we're done parsing
      return true;
    }
  });
}
