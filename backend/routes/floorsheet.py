from fastapi import APIRouter, HTTPException, Response
import asyncio
import io
import csv
from nepse_client import nepse_client
from cache import cache
import logging

router = APIRouter(prefix="/api/floorsheet", tags=["floorsheet"])
logger = logging.getLogger("floorsheet")

def _fetch_floorsheet_sync():
    """Fetch floorsheet from NEPSE API (blocking). Run in a thread."""
    data = nepse_client.get_floorsheet()
    if data:
        cache.set("floorsheet_full", data, 300)
    return data

@router.get("/export")
async def export_full_floorsheet():
    cached = cache.get("floorsheet_full")
    data = cached if cached else await asyncio.to_thread(_fetch_floorsheet_sync)
    
    if not data:
        raise HTTPException(status_code=503, detail="Floorsheet data unavailable for export")
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    if data:
        keys = list(data[0].keys())
        writer.writerow(keys)
        for row in data:
            writer.writerow([row.get(k, "") for k in keys])
            
    headers = {
        "Content-Disposition": "attachment; filename=nepse_floorsheet.csv"
    }
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)

@router.get("/")
async def get_full_floorsheet():
    """
    Full day floorsheet. This is the heaviest endpoint.
    Returns cached data immediately; if cache is empty, fetches in background thread.
    """
    cached = cache.get("floorsheet_full")
    if cached:
        return {"status": "ok", "source": "cache", "total": len(cached), "data": cached}
    
    # Fetch in a thread to avoid blocking the event loop
    data = await asyncio.to_thread(_fetch_floorsheet_sync)
    if data:
        return {"status": "ok", "source": "live", "total": len(data), "data": data}
    raise HTTPException(status_code=503, detail="Floorsheet data unavailable")

@router.get("/{symbol}")
async def get_company_floorsheet(symbol: str):
    cache_key = f"floorsheet_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "symbol": symbol, "data": cached}
    
    data = await asyncio.to_thread(nepse_client.get_company_floorsheet, symbol.upper())
    if data is not None:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "symbol": symbol, "data": data}
    
    # Return empty list if no data found instead of 404
    return {"status": "ok", "source": "live", "symbol": symbol, "data": []}
