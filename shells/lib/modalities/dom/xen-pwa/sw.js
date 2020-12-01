/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const version = 'pwa.cache.00';

const artifacts = [
  ['index.html', 0]
];

const metaUrl = '_meta';

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(version).then(populateCache));
});

const populateCache = function(cache) {
  // load cached meta data
  cache.match(metaUrl).then(function(response) {
    return response && response.json();
  })
  // response.json() will throw if data is malformed (or empty)
  .catch(function() {})
  // process the eventual object (or null)
  .then(function(meta) {
    validateCache(cache, meta || Object.create(null));
  });
};

const validateCache = function(cache, meta) {
  // create meta data object if we don't have one
  meta = meta || Object.create(null);
  console.group('validate cache' + new Date().toLocaleString());
  // fetch artifacts that are out of date
  if (!artifacts.reduce(validateCacheArtifact.bind(self, cache, meta), true)) {
    // if any artifact failed to validate, update meta data
    cache.put(metaUrl, new Response(JSON.stringify(meta)));
  }
  console.groupEnd();
};

const validateCacheArtifact = function(cache, meta, value, artifact) {
  const url = artifact[0];
  const version = artifact[1];
  const current = (meta[url] !== version);
  console.log(url + '.' + version + ' is ' + (current ? 'up-to-date' : 'OLD (' + meta[url] + ')'));
  if (current) {
    meta[url] = version;
    cache.add(url);
  }
  return value && current;
};

// serviceworker's hook into network operations
self.addEventListener('fetch', function(event) {
  // in certain unusual situations, we may want to no-op
  // and let the default machinery handle the request
  if (shouldFetch(event.request)) {
    event.respondWith(smartFetch(maybeRedirect(event.request)));
  }
});

const shouldFetch = function(request) {
  return (!request.url.startsWith('chrome-extension'));
};

const maybeRedirect = function(request) {
  return request;
};

const smartFetch = function(request) {
  console.log(`sw.fetch: ${request.url}`);
  // return a cached response, or at least the fetch promise
  return caches.match(request).then(function(response) {
    return response || fetchThenCache(request);
  });
};

const fetchThenCache = function(request) {
  return fetch(request).then(function(response) {
    maybeCache(request, response);
    return response;
  }).catch(function(error) {
    throw error;
  });
};

const maybeCache = function(request, response) {
  // cache everything
  cache(request, response);
};

const cache = function(request, response) {
  console.log(`sw.cache: ${request.url}`);
  // TODO(sjmiles): we don't require cloning if we are
  // just freshening the cache, how expensive is it?
  // Alternatively we could use cache.add(), but
  // it sounds more expensive?
  const cacheable = response.clone();
  caches.open(version).then(function(cache) {
    cache.put(request, cacheable).catch(function(error) {
      console.error(error);
    });
  });
};
