/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
(() => {
  //
  // 1. Deny everything
  // 2. Scripts from self, the inner <script> tag, and transitively loaded are allowed
  //   a. nonce currently is hardcoded, but should be random
  // 3. Scripts from explicitly whitelisted 3P allowed
  // 4. fonts only allowed from Google fonts and sjmiles repo
  // 5. Images allowed from 3P, plus data: URLs
  // 6. CSS allowed as inline <style>, as well as 3P whitelist
  // TODO: make this dynamically generated at build time for static file serving
  // TODO: get rid of unsafe-inline for style?
  // TODO: construct whitelist dynamically from particle manifests
  //       OR use service worker to enforce
  // TODO(sjmiles): explain failure of `script-src 'strict-dynamic'`
  //
  const httpEquiv = 'Content-Security-Policy';
  const content = `
    script-src
        'self'
        wss://*.firebase.io wss://*.firebaseio.com
        https://*.firebaseio.com
        https://*.firebase.io
        https://raw.githubusercontent.com/shaper/
        https://sjmiles.github.io
        https://xenonjs.com
        https://*.tvmaze.com
        https://media.w3.org
        ;
    font-src
        'self'
        https://fonts.googleapis.com
        https://fonts.gstatic.com
        https://raw.githubusercontent.com/shaper/
        https://sjmiles.github.io
        ;
    img-src
        'self'
        blob:
        data:
        https://firebasestorage.googleapis.com
        https://raw.githubusercontent.com/shaper/
        https://sjmiles.github.io
        https://xenonjs.com
        https://*.tvmaze.com
        https://media.w3.org
        http://*.gstatic.com
        https://s1.ticketm.net
        https://i.scdn.co
        ;
    style-src
        'self'
        'unsafe-inline'
        https://fonts.googleapis.com
        https://fonts.gstatic.com
        https://raw.githubusercontent.com/shaper/
        https://sjmiles.github.io
        https://xenonjs.com
        https://media.w3.org
        ;
  `
  // (optional) compress whitespace
  .replace(/\n| +/g, ' ')
  ;
  document.head.appendChild(Object.assign(document.createElement('meta'), {httpEquiv, content}));
})();
