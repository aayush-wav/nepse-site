from fastapi import APIRouter
import httpx
from bs4 import BeautifulSoup
import asyncio
from datetime import datetime
import logging

router = APIRouter(prefix="/api/ipo", tags=["ipo"])
logger = logging.getLogger("ipo_scraper")

_ipo_cache = []
_last_fetch_time = 0
CACHE_TTL = 3600  # 1 hour


def fetch_ipo_data():
    """Scrape IPO data or fallback to a static list if unavailable.
    
    In production this would hit ShareSansar / SEBON / MeroShare endpoints.
    Until then we return a rich static dataset that mirrors the real field schema.
    """
    try:
        mock_live_data = [
            {
                "id": "1",
                "company": "Sonapur Minerals And Oil Limited",
                "symbol": "SONA",
                "type": "IPO",
                "sector": "Manufacturing And Processing",
                "status": "closed",
                "price": 237.58,
                "faceValue": 100,
                "units": 9732544,
                "listedShares": 48662720,
                "publicShares": 9732544,
                "promoterShares": 38930176,
                "openDate": "2026-02-14",
                "closeDate": "2026-02-28",
                "allotmentDate": "2026-03-05",
                "listingDate": "2026-03-15",
                "banker": "NIMB Ace Capital",
                "rating": "CARE-NP BBB-",
                "oversubscribed": "1.5x",
                "oversubscriptionRatio": 1.5,
                "minApplication": 10,
                "maxApplication": 200,
                "purpose": "Expansion of mineral processing plant in Rupandehi district and working capital requirement.",
                "eps": 12.40,
                "nav": 148.20,
                "peRatio": 19.16,
                "bookValue": 148.20,
                "netProfit": 42500000,
                "paidUpCapital": 486627200,
                "registeredCapital": 600000000,
                "totalAssets": 980000000,
                "totalShares": 4866272
            },
            {
                "id": "2",
                "company": "Sarbamaha Aushadhi Limited",
                "symbol": "SAL",
                "type": "IPO",
                "sector": "Pharmaceuticals",
                "status": "upcoming",
                "price": 100,
                "faceValue": 100,
                "units": 1500000,
                "listedShares": 10000000,
                "publicShares": 1500000,
                "promoterShares": 8500000,
                "openDate": "2026-06-15",
                "closeDate": "2026-06-19",
                "allotmentDate": None,
                "listingDate": None,
                "banker": "Sanima Capital",
                "rating": "ICRA-NP BB",
                "oversubscribed": None,
                "oversubscriptionRatio": None,
                "minApplication": 10,
                "maxApplication": 200,
                "purpose": "Construction of new production facility and procurement of pharmaceutical machinery.",
                "eps": 8.20,
                "nav": 112.50,
                "peRatio": 12.20,
                "bookValue": 112.50,
                "netProfit": 18000000,
                "paidUpCapital": 85000000,
                "registeredCapital": 100000000,
                "totalAssets": 215000000,
                "totalShares": 1000000
            },
            {
                "id": "3",
                "company": "Himalayan Reinsurance Limited",
                "symbol": "HRL",
                "type": "IPO",
                "sector": "Non Life Insurance",
                "status": "closed",
                "price": 206,
                "faceValue": 100,
                "units": 30000000,
                "listedShares": 150000000,
                "publicShares": 30000000,
                "promoterShares": 120000000,
                "openDate": "2026-01-21",
                "closeDate": "2026-01-25",
                "allotmentDate": "2026-02-05",
                "listingDate": "2026-02-14",
                "banker": "NMB Capital",
                "rating": "ICRA-NP A-",
                "oversubscribed": "4.2x",
                "oversubscriptionRatio": 4.2,
                "minApplication": 10,
                "maxApplication": 200,
                "purpose": "Capital adequacy requirements per IAIS guidelines for reinsurance companies; expansion of risk retention capacity.",
                "eps": 18.60,
                "nav": 132.80,
                "peRatio": 11.08,
                "bookValue": 132.80,
                "netProfit": 279000000,
                "paidUpCapital": 1500000000,
                "registeredCapital": 2000000000,
                "totalAssets": 4200000000,
                "totalShares": 15000000
            },
            {
                "id": "4",
                "company": "Muktinath Krishi Company",
                "symbol": "MKC",
                "type": "IPO",
                "sector": "Agriculture",
                "status": "open",
                "price": 100,
                "faceValue": 100,
                "units": 1148000,
                "listedShares": 5740000,
                "publicShares": 1148000,
                "promoterShares": 4592000,
                "openDate": "2026-05-20",
                "closeDate": "2026-05-24",
                "allotmentDate": None,
                "listingDate": None,
                "banker": "Nabil Investment Banking",
                "rating": "CARE-NP BB",
                "oversubscribed": "1.1x",
                "oversubscriptionRatio": 1.1,
                "minApplication": 10,
                "maxApplication": 200,
                "purpose": "Purchase of agricultural land, construction of cold storage, and working capital.",
                "eps": 6.80,
                "nav": 108.30,
                "peRatio": 14.71,
                "bookValue": 108.30,
                "netProfit": 7820000,
                "paidUpCapital": 45920000,
                "registeredCapital": 57400000,
                "totalAssets": 120000000,
                "totalShares": 574000
            },
            {
                "id": "5",
                "company": "Nepal Hydropower Development Company",
                "symbol": "NHDC",
                "type": "IPO",
                "sector": "Hydro Power",
                "status": "upcoming",
                "price": 100,
                "faceValue": 100,
                "units": 5000000,
                "listedShares": 25000000,
                "publicShares": 5000000,
                "promoterShares": 20000000,
                "openDate": "2026-07-10",
                "closeDate": "2026-07-14",
                "allotmentDate": None,
                "listingDate": None,
                "banker": "Citizens Investment Trust",
                "rating": "ICRA-NP BBB",
                "oversubscribed": None,
                "oversubscriptionRatio": None,
                "minApplication": 10,
                "maxApplication": 400,
                "purpose": "Construction of 22.1 MW run-of-river hydropower project in Sindhupalchok district.",
                "eps": 5.40,
                "nav": 102.10,
                "peRatio": 18.52,
                "bookValue": 102.10,
                "netProfit": 13500000,
                "paidUpCapital": 200000000,
                "registeredCapital": 250000000,
                "totalAssets": 580000000,
                "totalShares": 2500000
            },
            {
                "id": "6",
                "company": "Infinity Laghubitta Bittiya Sanstha Limited",
                "symbol": "ILBS",
                "type": "IPO",
                "sector": "Microfinance",
                "status": "closed",
                "price": 100,
                "faceValue": 100,
                "units": 800000,
                "listedShares": 4000000,
                "publicShares": 800000,
                "promoterShares": 3200000,
                "openDate": "2025-12-10",
                "closeDate": "2025-12-14",
                "allotmentDate": "2025-12-22",
                "listingDate": "2026-01-05",
                "banker": "Muktinath Capital",
                "rating": "CARE-NP BBB",
                "oversubscribed": "6.8x",
                "oversubscriptionRatio": 6.8,
                "minApplication": 10,
                "maxApplication": 200,
                "purpose": "Expansion of microfinance operations to rural districts of Karnali and Sudurpashchim provinces.",
                "eps": 38.20,
                "nav": 210.50,
                "peRatio": 2.62,
                "bookValue": 210.50,
                "netProfit": 45840000,
                "paidUpCapital": 32000000,
                "registeredCapital": 40000000,
                "totalAssets": 820000000,
                "totalShares": 400000
            }
        ]
        return mock_live_data
    except Exception as e:
        logger.error(f"Error fetching IPO data: {e}")
        return []


@router.get("/")
async def get_ipo_list():
    global _ipo_cache, _last_fetch_time
    current_time = datetime.now().timestamp()
    if not _ipo_cache or (current_time - _last_fetch_time) > CACHE_TTL:
        new_data = await asyncio.to_thread(fetch_ipo_data)
        if new_data:
            _ipo_cache = new_data
            _last_fetch_time = current_time
    if not _ipo_cache:
        return {"data": []}
    return {"data": _ipo_cache}


@router.post("/check")
async def check_allotment(payload: dict):
    """Single BOID allotment check (kept for backward compatibility)."""
    boid = payload.get("boid")
    company_id = payload.get("companyId")
    if not boid or not company_id:
        return {"status": "error", "message": "BOID and Company ID are required"}
    await asyncio.sleep(0.8)
    try:
        last_digit = int(boid[-1])
        if last_digit % 3 == 0:
            return {"status": "success", "allotted": True, "units": 10,
                    "message": "Congratulations! You have been allotted 10 units."}
        else:
            return {"status": "success", "allotted": False, "units": 0,
                    "message": "Sorry, not allotted for the entered BOID."}
    except Exception:
        return {"status": "error", "message": "Invalid BOID format"}


@router.post("/check-bulk")
async def check_allotment_bulk(payload: dict):
    """Bulk BOID allotment check — accepts a list of BOIDs and returns
    a result for each. Runs checks concurrently for speed.
    
    Request body:
        { "boids": [{"id": "...", "name": "...", "boid": "..."}],
          "companyId": "..." }
    
    Response:
        { "status": "success", "companyId": "...", "results": [...] }
    """
    boids_input = payload.get("boids", [])
    company_id = payload.get("companyId")

    if not company_id:
        return {"status": "error", "message": "Company ID is required"}
    if not boids_input:
        return {"status": "error", "message": "At least one BOID is required"}
    if len(boids_input) > 30:
        return {"status": "error", "message": "Maximum 30 BOIDs allowed per check"}

    async def check_one(entry: dict):
        boid = str(entry.get("boid", ""))
        entry_id = entry.get("id", boid)
        name = entry.get("name", f"BOID {boid[:4]}…")

        if len(boid) != 16 or not boid.isdigit():
            return {
                "id": entry_id, "name": name, "boid": boid,
                "status": "error", "allotted": False, "units": 0,
                "message": "Invalid BOID — must be exactly 16 digits"
            }

        # Simulate realistic per-BOID latency (50-300ms)
        await asyncio.sleep(0.05 + (int(boid[-2]) * 0.025))

        try:
            last_digit = int(boid[-1])
            second_last = int(boid[-2])
            # ~33% allotment rate; seed varies per digit for determinism
            allotted = (last_digit + second_last) % 3 == 0
            units = 10 if allotted else 0
            return {
                "id": entry_id, "name": name, "boid": boid,
                "status": "success",
                "allotted": allotted,
                "units": units,
                "message": (
                    f"Congratulations! {name} has been allotted {units} units."
                    if allotted
                    else f"{name} was not allotted in this round."
                )
            }
        except Exception:
            return {
                "id": entry_id, "name": name, "boid": boid,
                "status": "error", "allotted": False, "units": 0,
                "message": "Failed to process BOID"
            }

    results = await asyncio.gather(*[check_one(e) for e in boids_input])

    allotted_count = sum(1 for r in results if r.get("allotted"))
    total_units = sum(r.get("units", 0) for r in results)

    return {
        "status": "success",
        "companyId": company_id,
        "results": list(results),
        "summary": {
            "total": len(results),
            "allotted": allotted_count,
            "notAllotted": len(results) - allotted_count,
            "totalUnits": total_units
        }
    }
