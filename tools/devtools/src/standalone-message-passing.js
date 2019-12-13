/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// If not in DevTools, run devtools.js script for message passing.
if (!chrome || !chrome.devtools) {
  const script = document.createElement('script');
  script.setAttribute('src', 'src/devtools.js');
  script.setAttribute('type', 'module');
  document.getElementsByTagName('head')[0].appendChild(script);
}
