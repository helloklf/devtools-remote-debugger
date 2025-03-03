/**
 * [outdated]
 * 根据devtools_app_worker.json配置，预加载必要资源
 * 但这并不能减少请求数量和网络需求，已被废弃
 */

const storageName = 'devtools_app';

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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        const url = new URL(event.request.url);
        if (!(
          url.pathname.includes('devtools_package') ||
          url.pathname.includes('/front_end/') ||
          url.pathname.includes(".html"))
        ) {
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
