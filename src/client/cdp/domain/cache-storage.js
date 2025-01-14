import BaseDomain from './domain';
import { Event } from './protocol';
export default class DomStorage extends BaseDomain {
  namespace = 'CacheStorage';

  async requestCacheNames ({ securityOrigin, storageKey }) {
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

  async requestEntries ({ cacheId, skipCount = 0, pageSize = 20, pathFilter }) {
    console.log('requestEntries', { cacheId, skipCount, pageSize, pathFilter });
    return window.caches.open(cacheId).then(async cache => {
      const items = await cache.keys().then(keys => keys.filter(it => !pathFilter || url.includes(pathFilter)))
      return items.slice(skipCount, skipCount + pageSize)
    })
  }
};
