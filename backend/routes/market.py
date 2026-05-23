from fastapi import APIRouter
import asyncio
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/market", tags=["market"])

TTL_LIVE = 15
TTL_MEDIUM = 60

@router.get("/live")
async def get_live_trading():
    cached = cache.get("live_trading")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_live_trading)
    if data:
        cache.set("live_trading", data, TTL_LIVE)
    return {"status": "ok", "source": "live", "data": data or []}

@router.get("/gainers")
async def get_top_gainers():
    cached = cache.get("top_gainers")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_top_gainers)
    if data:
        cache.set("top_gainers", data, TTL_LIVE)
    return {"status": "ok", "data": data or []}

@router.get("/losers")
async def get_top_losers():
    cached = cache.get("top_losers")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_top_losers)
    if data:
        cache.set("top_losers", data, TTL_LIVE)
    return {"status": "ok", "data": data or []}

@router.get("/turnover")
async def get_top_turnover():
    cached = cache.get("top_turnover")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_top_turnover)
    if data:
        cache.set("top_turnover", data, TTL_LIVE)
    return {"status": "ok", "data": data or []}

@router.get("/volume")
async def get_top_volume():
    cached = cache.get("top_volume")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_top_volume)
    if data:
        cache.set("top_volume", data, TTL_LIVE)
    return {"status": "ok", "data": data or []}

@router.get("/transactions")
async def get_top_transactions():
    cached = cache.get("top_transactions")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_top_transaction)
    if data:
        cache.set("top_transactions", data, TTL_LIVE)
    return {"status": "ok", "data": data or []}

@router.get("/status")
async def get_market_status():
    cached = cache.get("market_status")
    if cached:
        return {"status": "ok", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_market_status)
    if data:
        cache.set("market_status", data, TTL_LIVE)
    return {"status": "ok", "data": data}

@router.get("/summary")
async def get_market_summary():
    cached = cache.get("market_summary")
    if cached:
        return {"status": "ok", "source": "cache", "data": cached}
    data = await asyncio.to_thread(nepse_client.get_market_summary)
    if data:
        cache.set("market_summary", data, TTL_MEDIUM)
    return {"status": "ok", "source": "live", "data": data or {}}
