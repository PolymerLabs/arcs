// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


function populateIframe(doc) {

  var iframe = doc.getElementById('arcs-if');
  let cdnRoot = 'http://localhost:5001/arcs-cdn/dev/';
  var newPageLink = doc.getElementById('ext-new-page');

  chrome.runtime.sendMessage(null, {method: 'getAmKey'}, response => {
    var url = cdnRoot+"/app/?manifest=arcs-extension.manifest&amkey="+response;
    iframe.src = url;

    newPageLink.onclick = () => {
      chrome.runtime.sendMessage(null, { method: 'reInitArcs', args: {}});

      chrome.tabs.create({url: url});
      window.close();
      return false;
    };
  });
}
