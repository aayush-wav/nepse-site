from nepse import Nepse
import logging

logger = logging.getLogger("nepse_client")

class NepseClient:
    def __init__(self):
        self._nepse = Nepse()
        self._nepse.setTLSVerification(False)  # Required: NEPSE SSL cert issue
        logger.info("NepseClient initialized with TLS verification disabled")

    def _safe_call(self, method_name: str, *args, **kwargs):
        """Wrap every nepse call in error handling. Returns data or empty fallback."""
        try:
            method = getattr(self._nepse, method_name)
            result = method(*args, **kwargs)
            return result
        except Exception as e:
            logger.error(f"NepseAPI call '{method_name}' failed: {e}")
            try:
                logger.info("Attempting to reinitialize NepseClient...")
                self._nepse = Nepse()
                self._nepse.setTLSVerification(False)
                method = getattr(self._nepse, method_name)
                result = method(*args, **kwargs)
                return result
            except Exception as e2:
                logger.error(f"Reinitialization failed: {e2}")
                return None

    # --- MARKET SUMMARY ---
    def get_market_summary(self):
        return self._safe_call("getSummary")

    def get_nepse_index(self):
        return self._safe_call("getNepseIndex")

    def get_nepse_sub_indices(self):
        return self._safe_call("getNepseSubIndices")

    def get_market_status(self):
        return self._safe_call("getMarketStatus")

    # --- COMPANY DATA ---
    def get_company_list(self):
        return self._safe_call("getCompanyList")

    def get_company_price_detail(self, symbol: str):
        # Pass symbol to get company ID, library probably handles it or we pass symbol directly
        # If the library takes an ID, we might need a workaround, but passing symbol for now.
        return self._safe_call("getCompanyDetails", symbol)

    def get_security_detail(self, symbol: str):
        return self._safe_call("getCompanyDetails", symbol)

    # --- LIVE MARKET ---
    def get_live_trading(self):
        data = self._safe_call("getLiveMarket")
        if not data:
            logger.info("Live market empty, falling back to price volume (today's price)")
            data = self._safe_call("getPriceVolume")
        return data

    def get_supply_demand(self, symbol: str):
        """Get market depth (Top 5 Buy/Sell orders) for a specific stock."""
        return self._safe_call("getSupplyDemand", symbol)

    def get_top_gainers(self):
        return self._safe_call("getTopGainers")

    def get_top_losers(self):
        return self._safe_call("getTopLosers")

    def get_top_turnover(self):
        return self._safe_call("getTopTenTurnoverScrips")

    def get_top_volume(self):
        return self._safe_call("getTopTenTradeScrips")

    def get_top_transaction(self):
        return self._safe_call("getTopTenTransactionScrips")

    # --- INDICES ---
    def get_indices(self):
        return self._safe_call("getNepseIndex")

    def get_sector_sub_indices(self):
        return self._safe_call("getNepseSubIndices")

    # --- FLOORSHEET ---
    def get_floorsheet(self):
        return self._safe_call("getFloorSheet")

    def get_company_floorsheet(self, symbol: str):
        return self._safe_call("getFloorSheetOf", symbol)

    # --- GRAPH / HISTORICAL ---
    def get_company_daily_chart(self, symbol: str):
        return self._safe_call("getDailyScripPriceGraph", symbol)

    def get_company_chart(self, symbol: str):
        return self._safe_call("getCompanyPriceVolumeHistory", symbol)

# Singleton instance
nepse_client = NepseClient()
