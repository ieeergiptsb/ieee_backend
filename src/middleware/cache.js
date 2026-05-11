import NodeCache from 'node-cache';

// maxKeys caps memory: at most 200 cached responses in process at any time.
// checkperiod runs cleanup every 60 s so expired entries are freed promptly.
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 200 });

export const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Use the URL + query parameters + userId as the unique cache key
    const key = '__api_cache__' + (req.originalUrl || req.url) + (req.userId ? `_user_${req.userId}` : '');
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      console.log(`⚡ Cache hit: ${key}`);
      return res.json(cachedResponse);
    } else {
      console.log(`🔻 Cache miss: ${key}`);
      const originalJson = res.json;
      
      // Override res.json to intercept the payload
      res.json = (body) => {
        res.json = originalJson;

        // Only cache successful responses under ~200 KB (serialised).
        // Skipping large payloads keeps the in-process cache lean.
        if (res.statusCode === 200 && body.success !== false) {
          try {
            const approxSize = JSON.stringify(body).length;
            if (approxSize < 200_000) {
              cache.set(key, body, duration);
            }
          } catch {}
        }

        return originalJson.call(res, body);
      };
      
      next();
    }
  };
};

export const clearCache = (pattern = '') => {
  if (pattern) {
    const keys = cache.keys();
    const keysToDelete = keys.filter(k => k.includes(pattern));
    if (keysToDelete.length > 0) {
      cache.del(keysToDelete);
      console.log(`🧹 Cleared ${keysToDelete.length} cache keys matching: ${pattern}`);
    }
  } else {
    cache.flushAll();
    console.log('🧹 Cleared all cache');
  }
};
