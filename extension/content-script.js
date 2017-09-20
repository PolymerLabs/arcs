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

    // TODO(smalls) - technically, there might be a race in here (in some
    // browsers?). If the user clicks quickly betteen tabs with the plugin
    // active they can get out-of-order responses. Maybe?
    extractEntities().then(result => {
      console.log('result of extractEntities', result);
      sendResponse(result);
    });

    return true;
  }
);
