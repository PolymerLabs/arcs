/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// __ARCS_MD5__ will be replaced in place to reflect md5 checksum of the bazel
// output directory. This is required prior to M78 since service worker can
// invalidate and rebuild caches only when the content of its source script
// changes.
const SW_CACHES_VERSION = '__ARCS_MD5__';

// The storage of caches
const SW_CACHES_FILE = `arcs_${SW_CACHES_VERSION}`;

// Pre-builds caches for the listed files and resources ahead of time.
// Other file caches will be generated then cached at run-time upon accesses.
const PREBUILT_CACHES = [
  './worker.js',
  './shell.js',
];

// The files/resources are never served/cached by the Arcs Cache Manager.
const BLACKLIST = [
  'cache-mgr.js',
];

self.addEventListener('install', event => {
  async function buildCache() {
    console.log('building Arcs caches');
    const cache = await caches.open(SW_CACHES_FILE);
    return cache.addAll(PREBUILT_CACHES);
  }
  // Terminates the existing service worker at the same scope to
  // serve upcoming requests with the up-to-date caches.
  event.waitUntil(buildCache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Cleans up the caches at the stale stores.
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== SW_CACHES_FILE) {
          return caches.delete(key);
        }
      })
    )).then(() => {
      // Serves the current page immediately instead of waiting until
      // next page load/refresh.
      clients.claim();
      console.log(`${SW_CACHES_FILE} started serving Arcs caches`);
    })
  );
});

self.addEventListener('fetch', event => {
  async function cachedFetch(event) {
    const cache = await caches.open(SW_CACHES_FILE);
    let response = await cache.match(event.request);
    if (response) {
      return response;
    }
    response = await fetch(event.request);
    cache.put(event.request, response.clone());
    return response;
  }
  // Suppress warning: 'only-if-cached' can be set only with 'same-origin' mode
  if (event.request.mode !== 'same-origin' &&
      event.request.cache === 'only-if-cached') {
    return;
  }
  // Bypass non-sw-scope resource caching i.e. reflecting in-place editing on
  // workstation assets when enabling debug.arcs.runtime.load_workstation_assets
  if (event.request.url.indexOf(self.location.host) === -1) {
    return;
  }
  // Bypass the resources and files in the blacklist
  for (const res of BLACKLIST) {
    if (event.request.url.endsWith(res)) {
      return;
    }
  }
  event.respondWith(cachedFetch(event));
});
