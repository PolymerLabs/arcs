// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

function _getUrl(cdnRoot, arcManifest, amKey) {
  return cdnRoot+'?manifest='+encodeURIComponent(arcManifest)+'&amkey='+amKey;
}

function populateIframe(doc) {

  var iframe = doc.getElementById('arcs-if');
  let cdnRoot = 'https://polymerlabs.github.io/arcs-cdn/dev/app/';
  let arcManifest = 'https://seefeldb.github.io/arc-stories/artifacts/Products/recipes.manifest';
  var newPageLink = doc.getElementById('ext-new-page');
  var reinitLink = doc.getElementById('ext-reinit');
  var displayAmKey = doc.getElementById('ext-amkey');

  chrome.runtime.sendMessage(null, {method: 'getAmKey'}, response => {
    var url = _getUrl(cdnRoot, arcManifest, response);
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
            iframe.src = _getUrl(cdnRoot, arcManifest, response);
          });
      };
    }
    if (displayAmKey) {
      displayAmKey.innerText = 'amkey: '+response;
    }
  });
}
