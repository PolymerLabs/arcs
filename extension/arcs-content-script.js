// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// TODO(smalls) there should be a better way to detect an arcs page we can
// inject data into.
const isArcsPage =
  document.body.getElementsByTagName('extension-app-shell').length > 0;

// TODO(smalls) can this be split into 2 content scripts, with the logic for
// each type of page only loaded for that type of page?
if (!isArcsPage) {
  // In the common case, if we're not running an arcs instance, extract entities
  // from the page.
  /*
  extractEntities(document, window.location).then(results => {
    console.log('content-script result of extractEntities', results);
    chrome.runtime.sendMessage({
      method: 'storePageEntities',
      url: window.location.toString(),
      results: results
    });
  });
  */

  // Listen for requests from the event page
  chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    console.log('non-arcs-page content script received message ' + request, request);
    if (request.method == 'loadEntities') {
      extractEntities(document, window.location).then(results => {
        console.log('hey!! content-script result of extractEntities', results);
        sendResponse(results);
      });

      // we'll send a response async, once we're done parsing
      return true;
    }
  });
} else {
  // We're running an Arcs page. Grab the metadata and send it over to the
  // Arcs chrome-extension shell.
  //chrome.runtime.sendMessage({ method: 'loadAllEntities' }, entities => {
  //  console.log('received entities from extension; forwarding to content-script for injection',
  //    entities);
  //  window.postMessage({ method: 'injectArcsData', entities: entities }, '*');
  //});

  // In case we fired entities before anyone was listening, let's listen for
  // requests to send entities as well.
  window.addEventListener('message', event => {
    console.log('arcs-page content script received event ' + event.data.method, event.data);
    if (event.source != window || event.data.method != 'pleaseInjectArcsData') {
      return;
    }
    // sendInjectArcsDataMessage();

    chrome.runtime.sendMessage({ method: 'loadAllEntities' }, entities => {
      console.log('arcs-page content script received entities from extension; forwarding to extension-app-shell for injection',
        entities);
      window.postMessage({ method: 'injectArcsData', entities: entities }, '*');
    });
  });
}
