// simple cache
// clears if receiving fetch for ../flush.me
// must be in shell/ so it can cache shell/artifacts/, etc.

let cacheVersion = 1;

self.addEventListener('install', function(event) {
  console.log('cache: install');
});

self.addEventListener('fetch', function(event) {
  const cacheName = 'cache' + cacheVersion;
  if (event.request.url.match(/\/flush\.me$/)) {
    event.waitUntil(caches.delete(cacheName));
    event.respondWith(new Response(`cache $cacheName flushed.`));
    cacheVersion++;
    console.log('cache: flushed, and version incremented to', cacheVersion);
  } else event.respondWith(
    caches.match(event.request).then(function(resp) {
      return resp || fetch(event.request).then(function(response) {
        return caches.open(cacheName).then(function(cache) {
          cache.put(event.request, response.clone());
          return response;
        });  
      });
    })
  );
});
