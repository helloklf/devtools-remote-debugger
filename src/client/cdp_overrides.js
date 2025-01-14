/**
 * service-worker.js
 * [experimental] Use service workers to replace static resources
 */

const CACHE_NAME = 'cdp_overrides';
const preCacheTargets = [
];

function addCache({ url, content, contentType }) {
  caches.open(CACHE_NAME)
    .then(cache => {
      const response = new Response(content, {
        headers: { 'Content-Type': contentType || 'text/plain' }
      });

      const request = new Request(url);

      cache.put(request, response).then(() => {
        console.log(url, 'covered');
      });
    })
}

// Example: addCache({ url: '/dist/test.js', content: 'test' })

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(preCacheTargets);
      })
  );
});

self.addEventListener('message', event => {
  const { action, url, content, contentType } = event.data || {};
  if (action === 'cdp_override_add') {
    addCache({ url, content, contentType });
  }
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);

        // no need
        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

