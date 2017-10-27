// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

extractEntities().then(results => {
  console.log('content-script result of extractEntities', results);
  chrome.runtime.sendMessage({
    method: 'storePageEntities',
    url: window.location.toString(),
    results: results
  });
});
