// simple cache, flushing it on reload (if loaded via shell/apps/...)

const cacheName = 'arcs';

self.addEventListener('fetch', function(event) {
  if (event.request.url.match(/\/apps\/[a-z]+\/(index.html|\?|$)/)) {
    event.waitUntil(caches.delete(cacheName));
    event.respondWith(fetch(event.request));
    console.log('cache: flushed');
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
