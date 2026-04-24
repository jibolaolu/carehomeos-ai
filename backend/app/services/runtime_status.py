from __future__ import annotations

from urllib.parse import urlparse

import boto3
from redis.asyncio import Redis

from app.config import get_settings
from app.db import check_db_connection

settings = get_settings()


async def check_redis_connection() -> bool:
    client = Redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    try:
        return bool(await client.ping())
    except Exception:
        return False
    finally:
        await client.aclose()


def check_s3_connection() -> bool:
    try:
        parsed_url = urlparse(settings.s3_endpoint_url)
        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name="us-east-1",
        )
        client.list_buckets()
        return parsed_url.scheme in {"http", "https"}
    except Exception:
        return False


async def get_service_status() -> dict[str, bool]:
    return {
        "database": await check_db_connection(),
        "redis": await check_redis_connection(),
        "s3": check_s3_connection(),
    }
