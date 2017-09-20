// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

function gather_current_page() {
  extractEntities().then(result => {
    console.log(result);
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    if (request.method!='extractEntities') {
      return;
    }

    extractEntities().then(result => {
      console.log('result of extractEntities', result);
      sendResponse(result);
    });

    return true;
  }
);
