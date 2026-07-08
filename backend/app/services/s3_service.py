from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


def _get_s3_client() -> Any:
    import boto3
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.aws_region,
    )


def upload_bytes(bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> dict[str, object]:
    try:
        client = _get_s3_client()
        client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        return {"bucket": bucket, "key": key, "bytes": len(data), "uploaded": True}
    except Exception as exc:
        logger.warning("S3 upload failed for s3://%s/%s: %s", bucket, key, exc)
        raise


def build_presigned_upload(key: str) -> dict[str, object]:
    return {"key": key, "url": f"http://localhost:9000/audio-temp/{key}", "method": "PUT"}


def delete_object(key: str) -> dict[str, object]:
    return {"key": key, "deleted": True}
