import logger from '../utils/logger.js';

export class RateLimiter {
  constructor() {
    this.limits = new Map();
  }

  check(userId, commandType, maxPerMinute) {
    const key = `${userId}:${commandType}`;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.limits.has(key)) {
      this.limits.set(key, []);
    }

    const timestamps = this.limits.get(key).filter(t => t > windowStart);
    this.limits.set(key, timestamps);

    if (timestamps.length >= maxPerMinute) {
      logger.warn(`Rate limit exceeded for ${key}`);
      return false;
    }

    timestamps.push(now);
    return true;
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - 60000;

    for (const [key, timestamps] of this.limits.entries()) {
      const filtered = timestamps.filter(t => t > windowStart);
      if (filtered.length === 0) {
        this.limits.delete(key);
      } else {
        this.limits.set(key, filtered);
      }
    }
  }
}

export default new RateLimiter();
