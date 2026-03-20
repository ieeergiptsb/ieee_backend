import NodeCache from 'node-cache';

// Initialize cache with default TTL of 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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
        // Restore the original json method
        res.json = originalJson;
        
        // Only cache if the request was successful
        if (res.statusCode === 200 && body.success !== false) {
          cache.set(key, body, duration);
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
