from fastapi import APIRouter
from nepse_client import nepse_client
from cache import cache

router = APIRouter(prefix="/api/indices", tags=["indices"])

@router.get("/nepse")
def get_nepse_index():
    cached = cache.get("nepse_index")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_nepse_index()
    if data:
        cache.set("nepse_index", data, 60)
    return {"status": "ok", "data": data or {}}

@router.get("/sub")
def get_sub_indices():
    cached = cache.get("nepse_sub_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_nepse_sub_indices()
    if data:
        cache.set("nepse_sub_indices", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/all")
def get_all_indices():
    cached = cache.get("all_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_indices()
    if data:
        cache.set("all_indices", data, 60)
    return {"status": "ok", "data": data or []}

@router.get("/sectors")
def get_sector_indices():
    cached = cache.get("sector_sub_indices")
    if cached:
        return {"status": "ok", "data": cached}
    data = nepse_client.get_sector_sub_indices()
    if data:
        cache.set("sector_sub_indices", data, 300)
    return {"status": "ok", "data": data or []}

@router.get("/sector-history/{sector}")
def get_sector_history(sector: str):
    # The NEPSE API doesn't expose historical sub-index charts.
    # We provide a mock 30-day historical line to power the UI.
    import time
    import random
    
    cached = cache.get("sector_sub_indices") or nepse_client.get_sector_sub_indices() or []
    current_val = 1000
    for s in cached:
        if s.get("index", "").lower().replace(" ", "") == sector.lower().replace(" ", ""):
            current_val = s.get("currentValue", 1000)
            break
            
    history = []
    base = current_val * 0.9
    now = int(time.time())
    
    for i in range(30, -1, -1):
        day_time = now - (i * 86400)
        # Random walk ending near current_val
        val = base + (random.random() * current_val * 0.2)
        if i == 0: val = current_val
        history.append({"time": day_time, "value": round(val, 2)})
        
    return {"status": "ok", "data": history}
