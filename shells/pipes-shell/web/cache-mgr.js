/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const ARCS_CACHE_MANAGER = './cache-mgr-sw.js';

// Arcs Cache Manager
(async function _arcsCacheManager() {
  const serviceWorker = navigator.serviceWorker;
  if (!serviceWorker) {
    return;
  }

  // Service Worker supports ONLY https:// and http://localhost.
  // Only https:// is accepted at this moment since local socket test
  // servers are not supported on devices.
  if (location.protocol !== 'https:') return;

  // Only registering the new cache manager service worker instance when
  // requested in 'https' protocol and with ?use-cache url parameter,
  // otherwise unregistering the existing service workers at this scope.
  const params = new URLSearchParams(window.location.search);
  if (!params.has('use-cache')) {
    serviceWorker.getRegistrations().then(function(regs) {
      for (const reg of regs) {
        console.log('unregistering Arcs Cache Manager: ' + reg.scope);
        reg.unregister();
      }
    }).catch(function(err) {
      console.log('Arcs Cache Manager unregistration failed: ' + err);
    });
    return;
  }

  navigator.serviceWorker.register(ARCS_CACHE_MANAGER)
    .then(reg => {
      console.log(`Arcs Cache Manager registered, scope: ${reg.scope}`);
    })
    .catch(err => {
      console.log(
        `Arcs Cache Manager registration failed: ${err.message}`);
    });
})();
