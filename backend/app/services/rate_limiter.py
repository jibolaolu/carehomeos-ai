from __future__ import annotations

import asyncio
import hashlib
import time
from collections import defaultdict
from typing import Any

import redis.asyncio as redis

from app.config import get_settings

settings = get_settings()

# In-memory rate limiter state
_in_memory_counters: dict[str, dict[str, Any]] = defaultdict(
    lambda: {"count": 0, "reset_at": 0.0}
)
_lock = asyncio.Lock()


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after
        super().__init__(f"Rate limit exceeded. Retry after {retry_after} seconds.")


class RateLimiter:
    """Simple in-memory rate limiter with Redis fallback."""

    def __init__(self, default_limit: int = 1000, window_seconds: int = 3600) -> None:
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self._redis: redis.Redis | None = None

    async def _get_redis(self) -> redis.Redis | None:
        if self._redis is not None:
            return self._redis
        try:
            self._redis = redis.from_url(settings.redis_url, decode_responses=True)
            await self._redis.ping()
            return self._redis
        except Exception:
            self._redis = None
            return None

    def _key(self, identifier: str) -> str:
        # Hourly bucket
        bucket = int(time.time()) // self.window_seconds
        return f"rl:{identifier}:{bucket}"

    async def is_allowed(self, identifier: str, limit: int | None = None) -> tuple[bool, dict[str, Any]]:
        """Check if a request is allowed. Returns (allowed, headers)."""
        limit = limit or self.default_limit
        now = time.time()
        bucket_end = ((int(now) // self.window_seconds) + 1) * self.window_seconds
        retry_after = int(bucket_end - now) + 1

        redis_client = await self._get_redis()
        if redis_client is not None:
            return await self._check_redis(redis_client, identifier, limit, retry_after)
        return await self._check_memory(identifier, limit, retry_after)

    async def _check_redis(
        self, redis_client: redis.Redis, identifier: str, limit: int, retry_after: int
    ) -> tuple[bool, dict[str, Any]]:
        key = self._key(identifier)
        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()
        current = results[0]
        headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(max(0, limit - current)),
            "X-RateLimit-Reset": str(int(time.time()) + retry_after),
        }
        if current > limit:
            return False, {**headers, "Retry-After": str(retry_after)}
        return True, headers

    async def _check_memory(self, identifier: str, limit: int, retry_after: int) -> tuple[bool, dict[str, Any]]:
        key = self._key(identifier)
        async with _lock:
            entry = _in_memory_counters[key]
            now = time.time()
            if now > entry["reset_at"]:
                entry["count"] = 0
                entry["reset_at"] = now + self.window_seconds
            entry["count"] += 1
            current = entry["count"]
            remaining = max(0, limit - current)
            headers = {
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(int(entry["reset_at"])),
            }
            if current > limit:
                return False, {**headers, "Retry-After": str(retry_after)}
            return True, headers

    async def reset(self, identifier: str) -> None:
        redis_client = await self._get_redis()
        if redis_client is not None:
            pattern = f"rl:{identifier}:*"
            keys = await redis_client.keys(pattern)
            if keys:
                await redis_client.delete(*keys)
        else:
            async with _lock:
                keys_to_remove = [k for k in _in_memory_counters if k.startswith(f"rl:{identifier}:")]
                for k in keys_to_remove:
                    del _in_memory_counters[k]


# Global instance
rate_limiter = RateLimiter(
    default_limit=settings.public_api_rate_limit,
    window_seconds=3600,
)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()
