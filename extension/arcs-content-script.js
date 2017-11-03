// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const isArcsPage = document.body.getElementsByTagName('extension-app-shell').length>0;

// In the common case, if we're not running an arcs instance, extract entities
// from the page.
if (!isArcsPage) {
  extractEntities().then(results => {
    console.log('content-script result of extractEntities', results);
    chrome.runtime.sendMessage({
      method: 'storePageEntities',
      url: window.location.toString(),
      results: results
    });
  });
}

// In the other case, we're running an Arcs page. Grab the metadata and
// send it over to the Arcs chrome-extension shell.
if (isArcsPage) {
  chrome.runtime.sendMessage({method: 'loadAllEntities'}, entities => {
    window.postMessage({method: 'injectArcsData', entities: entities}, '*');
  });
}

// In case we fired entities before anyone was listening, let's listen for
// requests to send entities as well.
window.addEventListener('message', event => {
  if (event.source != window || event.data.method != 'pleaseInjectArcsData') {
    return;
  }

  chrome.runtime.sendMessage({method: 'loadAllEntities'}, entities => {
    window.postMessage({method: 'injectArcsData', entities: entities}, '*');
  });
});
