from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from nepse_client import nepse_client
from cache import cache
import logging
from datetime import datetime

logger = logging.getLogger("scheduler")

# TTLs in seconds
TTL_LIVE = 15       # Price-sensitive live data
TTL_MEDIUM = 60     # Slightly less volatile data
TTL_SLOW = 600      # Slow-changing data
TTL_STATIC = 3600   # Rarely changes

def is_market_hours() -> bool:
    """Check if current Nepal time is within trading hours."""
    from datetime import timezone, timedelta
    nepal_tz = timezone(timedelta(hours=5, minutes=45))
    now = datetime.now(nepal_tz)
    # Nepal market: Sun(6), Mon(0), Tue(1), Wed(2), Thu(3)
    trading_days = [0, 1, 2, 3, 6]
    if now.weekday() not in trading_days:
        return False
    # 9:55 AM to 3:05 PM with buffers
    total_mins = now.hour * 60 + now.minute
    return 595 <= total_mins < 905

def refresh_live_data():
    """Called every 15 seconds during market hours for near-real-time data."""
    if not is_market_hours():
        logger.debug("Market closed — skipping live refresh")
        return
    logger.info("Refreshing live market data (15s cycle)...")

    data = nepse_client.get_live_trading()
    if data:
        cache.set("live_trading", data, ttl_seconds=TTL_LIVE)

    gainers = nepse_client.get_top_gainers()
    if gainers:
        cache.set("top_gainers", gainers, ttl_seconds=TTL_LIVE)

    losers = nepse_client.get_top_losers()
    if losers:
        cache.set("top_losers", losers, ttl_seconds=TTL_LIVE)

    turnover = nepse_client.get_top_turnover()
    if turnover:
        cache.set("top_turnover", turnover, ttl_seconds=TTL_LIVE)

    indices = nepse_client.get_nepse_index()
    if indices:
        cache.set("nepse_index", indices, ttl_seconds=TTL_LIVE)

    summary = nepse_client.get_market_summary()
    if summary:
        cache.set("market_summary", summary, ttl_seconds=TTL_MEDIUM)

def refresh_floorsheet():
    """Heavy operation. Called every 2 minutes."""
    if not is_market_hours():
        logger.debug("Market closed — skipping floorsheet refresh")
        return
    logger.info("Refreshing full floorsheet...")
    data = nepse_client.get_floorsheet()
    if data:
        cache.set("floorsheet_full", data, ttl_seconds=TTL_SLOW)

def refresh_slow_data():
    """Called every 10 minutes. Fetches heavier/less time-critical data."""
    logger.info("Refreshing slow data...")

    companies = nepse_client.get_company_list()
    if companies:
        cache.set("company_list", companies, ttl_seconds=TTL_STATIC)

    sub_indices = nepse_client.get_sector_sub_indices()
    if sub_indices:
        cache.set("sector_sub_indices", sub_indices, ttl_seconds=TTL_SLOW)

def start_scheduler():
    scheduler = BackgroundScheduler()

    # Live data: every 15 seconds
    scheduler.add_job(
        refresh_live_data,
        trigger=IntervalTrigger(seconds=15),
        id="live_data_refresh",
        replace_existing=True,
    )

    # Slow data: every 10 minutes
    scheduler.add_job(
        refresh_slow_data,
        trigger=IntervalTrigger(minutes=10),
        id="slow_data_refresh",
        replace_existing=True,
    )

    # Floorsheet data: every 2 minutes
    scheduler.add_job(
        refresh_floorsheet,
        trigger=IntervalTrigger(minutes=2),
        id="floorsheet_refresh",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background scheduler started (15s live cycle)")

    # Warm cache immediately on startup
    refresh_live_data()
    refresh_slow_data()

    return scheduler
