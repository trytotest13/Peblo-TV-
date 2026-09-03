"""Storage abstraction — pluggable between local disk and Cloudflare R2."""
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

settings = get_settings()


class StorageBackend:
    """Abstract base — swap implementations by changing STORAGE_BACKEND env var."""

    async def save(self, key: str, file_bytes: bytes) -> str:
        """Save bytes under `key`, return the public-facing URL."""
        raise NotImplementedError

    async def delete(self, key: str) -> None:
        raise NotImplementedError

    async def url(self, key: str) -> str:
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Local storage
# ---------------------------------------------------------------------------

class LocalStorage(StorageBackend):
    def __init__(self, base_path: str = ""):
        self.base_path = Path(base_path or settings.local_storage_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save(self, key: str, file_bytes: bytes) -> str:
        dest = self.base_path / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        return await self.url(key)

    async def delete(self, key: str) -> None:
        p = self.base_path / key
        if p.exists():
            p.unlink()

    async def url(self, key: str) -> str:
        # Returns a path relative to base; FastAPI's StaticFiles or a
        # media-mount in main.py serves these.
        return f"/media/{key}"


# ---------------------------------------------------------------------------
# Cloudflare R2 (S3-compatible)
# ---------------------------------------------------------------------------

class R2Storage(StorageBackend):
    def __init__(
        self,
        account_id: str = "",
        access_key: str = "",
        secret_key: str = "",
        bucket: str = "",
        public_base: str = "",
    ):
        self.account_id = account_id or settings.r2_account_id
        self.access_key = access_key or settings.r2_access_key_id
        self.secret_key = secret_key or settings.r2_secret_access_key
        self.bucket = bucket or settings.r2_bucket
        self.public_base = public_base or settings.r2_public_base_url

        endpoint = f"https://{self.account_id}.r2.cloudflarestorage.com"
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name="auto",
        )

    async def save(self, key: str, file_bytes: bytes) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=file_bytes)
        return await self.url(key)

    async def delete(self, key: str) -> None:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except ClientError:
            pass

    async def url(self, key: str) -> str:
        return f"{self.public_base}/{key}"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_storage() -> StorageBackend:
    backend = settings.storage_backend.lower()
    if backend == "r2":
        return R2Storage()
    return LocalStorage()


# Convenience singleton
_storage: StorageBackend | None = None

def get_storage_instance() -> StorageBackend:
    global _storage
    if _storage is None:
        _storage = get_storage()
    return _storage
