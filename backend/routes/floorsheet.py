from fastapi import APIRouter, HTTPException, Response
import io
import csv
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/floorsheet", tags=["floorsheet"])

@router.get("/export")
def export_full_floorsheet():
    cached = cache.get("floorsheet_full")
    data = cached if cached else nepse_client.get_floorsheet()
    
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
def get_full_floorsheet():
    """
    Full day floorsheet. This is the heaviest endpoint.
    Cache TTL = 5 minutes. Only call during market hours.
    """
    cached = cache.get("floorsheet_full")
    if cached:
        return {"status": "ok", "source": "cache", "total": len(cached), "data": cached}
    data = nepse_client.get_floorsheet()
    if data:
        cache.set("floorsheet_full", data, 300)
        return {"status": "ok", "source": "live", "total": len(data), "data": data}
    raise HTTPException(status_code=503, detail="Floorsheet data unavailable")

@router.get("/{symbol}")
def get_company_floorsheet(symbol: str):
    cache_key = f"floorsheet_{symbol.upper()}"
    cached = cache.get(cache_key)
    if cached:
        return {"status": "ok", "source": "cache", "symbol": symbol, "data": cached}
    data = nepse_client.get_company_floorsheet(symbol.upper())
    if data is not None:
        cache.set(cache_key, data, 300)
        return {"status": "ok", "source": "live", "symbol": symbol, "data": data}
    
    # Return empty list if no data found instead of 404
    return {"status": "ok", "source": "live", "symbol": symbol, "data": []}
