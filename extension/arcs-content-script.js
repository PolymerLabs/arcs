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

function sendInjectArcsDataMessage() {
  chrome.runtime.sendMessage({ method: 'loadAllEntities' }, entities => {
    window.postMessage({ method: 'injectArcsData', entities: entities }, '*');
  });
}

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
    console.log('hey!! content script received message ' + request, request);
    if (request.method == 'loadEntities') {
      extractEntities(document, window.location).then(results => {
        console.log('hey!! content-script result of extractEntities', results);
        sendResponse(results);
      });

      // we'll send a response async, once we're done parsing
      return true;
    }
  });

  // In case we fired entities before anyone was listening, let's listen for
  // requests to send entities as well.
  // XXX do I still need this?
  //window.addEventListener('message', event => {
  //  console.log('content script received event ' + event.data.method, event.data);
  //  if (event.source != window || event.data.method != 'pleaseInjectArcsData') {
  //    return;
  //  }
  //  sendInjectArcsDataMessage();
  //});
} else {
  // We're running an Arcs page. Grab the metadata and send it over to the
  // Arcs chrome-extension shell.
  sendInjectArcsDataMessage();
}
