import time
import json
import os
import threading
from typing import Any, Optional
import logging

logger = logging.getLogger("cache")

CACHE_FILE = "cache.json"

class TTLCache:
    def __init__(self):
        self._store: dict[str, dict] = {}
        self._dirty = False
        self._lock = threading.Lock()
        self._load_from_disk()
        
        # Start background save thread
        threading.Thread(target=self._periodic_save, daemon=True).start()

    def _load_from_disk(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r") as f:
                    data = json.load(f)
                    now = time.time()
                    for k, v in data.items():
                        # Extend expiration by 5 minutes on load so we serve stale data instantly 
                        # instead of blocking, while the background scheduler fetches fresh data
                        v["expires_at"] = max(v["expires_at"], now + 300)
                        self._store[k] = v
                logger.info(f"Loaded {len(self._store)} keys from disk cache")
            except Exception as e:
                logger.error(f"Failed to load disk cache: {e}")

    def _periodic_save(self):
        while True:
            time.sleep(15)
            if self._dirty:
                self._save_to_disk()

    def _save_to_disk(self):
        with self._lock:
            if not self._dirty: return
            try:
                # Make a shallow copy to avoid dict size changing during iteration
                store_copy = dict(self._store)
                with open(CACHE_FILE, "w") as f:
                    json.dump(store_copy, f)
                self._dirty = False
                logger.debug("Disk cache synced")
            except Exception as e:
                logger.error(f"Failed to save disk cache: {e}")

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            del self._store[key]
            logger.debug(f"Cache MISS (expired): {key}")
            return None
        logger.debug(f"Cache HIT: {key}")
        return entry["data"]

    def set(self, key: str, data: Any, ttl_seconds: int):
        self._store[key] = {
            "data": data,
            "expires_at": time.time() + ttl_seconds,
            "cached_at": time.time(),
        }
        self._dirty = True
        logger.debug(f"Cache SET: {key} (TTL={ttl_seconds}s)")

    def invalidate(self, key: str):
        if key in self._store:
            self._store.pop(key, None)
            self._dirty = True

    def clear_all(self):
        self._store.clear()
        self._dirty = True
        logger.info("Cache cleared")

    def stats(self) -> dict:
        now = time.time()
        active = {k: v for k, v in self._store.items() if v["expires_at"] > now}
        return {"total_keys": len(self._store), "active_keys": len(active)}

# Singleton
cache = TTLCache()
