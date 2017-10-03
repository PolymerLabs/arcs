// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

function _getUrl(cdnRoot, arcManifest, response) {
  let ret = cdnRoot+'?manifest='+arcManifest+'&amkey='+response.amKey;
  if (response.manifestUrls) {
    ret += response.manifestUrls.reduce((accum, current)=>accum+'&manifest='+current, '');
  }

  return ret;
}

function populateIframe(doc) {

  var iframe = doc.getElementById('arcs-if');
  let cdnApp = cdn + '/app/';
  var newPageLink = doc.getElementById('ext-new-page');
  var reinitLink = doc.getElementById('ext-reinit');
  var displayAmKey = doc.getElementById('ext-amkey');

  chrome.runtime.sendMessage(null, {method: 'getAmKeyAndManifests'}, response => {
    var url = _getUrl(cdnApp, defaultManifest, response);
    iframe.src = url;

    if (newPageLink) {
      newPageLink.onclick = () => {
        chrome.tabs.create({url: url});
        window.close();
        return false;
      };
    }
    if (reinitLink) {
      reinitLink.onclick = () => {
        chrome.runtime.sendMessage(null, { method: 'reInitArcs', args: {}},
          response => {
            if (displayAmKey) {
              displayAmKey.innerText = 'amkey: '+response;
            }
            iframe.src = _getUrl(cdnApp, defaultManifest, response);
          });
      };
    }
    if (displayAmKey) {
      displayAmKey.innerText = 'amkey: '+response.amKey;
    }
  });
}
