// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt


function populateIframe(doc) {

  var iframe = doc.getElementById('arcs-if');
  let cdnRoot = 'http://localhost:5001/arcs-cdn/dev/';

  chrome.runtime.sendMessage(null, {method: 'getAmKey'}, response => {
    iframe.src = cdnRoot+"/app/?manifest=arcs-extension.manifest&amkey="+response;
  });
}
