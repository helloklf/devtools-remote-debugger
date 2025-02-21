/**
 * service-worker.js
 * [experimental] Use service workers to replace static resources
 */

const storageName = 'devtools_app';

function addCache({ url, content, contentType }) {
  caches.open(storageName)
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
  self.skipWaiting();
  // event.waitUntil(
    caches.open(storageName)
      .then(cache => {
        fetch('./devtools_app_worker.json')
          .then(r => r.json())
          .then(preload => preload.forEach(it => cache.add(it)));
        // return cache.addAll(preCacheTargets);
      })
  // );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
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

        const url = new URL(event.request.url);
        if (!url.pathname.includes('/front_end/') || url.pathname.includes(".html")) {
          return fetch(event.request);
        }

        return fetch(event.request).then(
          response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(storageName)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});
