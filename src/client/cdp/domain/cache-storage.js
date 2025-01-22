import BaseDomain from './domain';
export default class DomStorage extends BaseDomain {
  namespace = 'CacheStorage';

  async requestCacheNames ({ securityOrigin, storageKey }) {
    if (window.caches) {
      const caches = await window.caches.keys()
      return {
        caches: caches.filter(it => !storageKey || it === storageKey).map(cache => {
          const origin = securityOrigin || window.location.origin
          return {
            cacheId: cache,
            securityOrigin: origin,
            storageKey: cache,
            cacheName: cache
          }
        })
      }
    }
  }

  async requestEntries ({ cacheId, skipCount = 0, pageSize = 20, pathFilter }) {
    const cache = await window.caches.open(cacheId)
    const items = await cache.keys().then(keys => keys.filter(it => !pathFilter || it.url.includes(pathFilter)))
    const p = items.slice(skipCount, skipCount + pageSize);
    const data = await Promise.all(p.map(async req => {
      const res = await cache.match(req);
      return {
        requestURL: req.url,
        requestMethod: req.method,
        requestHeaders: Object.entries(req.headers).map(it => ({ name: it[0], value: it[1] })),
        responseTime: 0,
        responseStatus: res.status,
        responseStatusText: res.statusText,
        responseType: res.type,
        responseHeaders: Object.entries(res.headers).map(it => ({ name: it[0], value: it[1] }))
      }
    }));
    return {
      cacheDataEntries: data,
      returnCount: items.length,
    }
  }

  async requestCachedResponse({ cacheId, requestURL, requestHeaders }) {
    const cache = await window.caches.open(cacheId)
    const req = new Request(requestURL)
    const res = await cache.match(req);
    const arrayBuffer = await res.arrayBuffer();
    const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return {
      response: {
        body: base64String
      }
    }
  }

  async deleteCache({ cacheId }) {
    await window.caches.delete(cacheId)
  }

  /**
   * @param {string} request URL spec of the request
   */
  async deleteEntry({ cacheId, request }) {
    const cache = await window.caches.open(cacheId)
    cache.delete(new Request(request))
  }
};
