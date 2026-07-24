"""
StockPredictor — Loads saved ML models and serves stock price predictions.
Used by the chat endpoint to answer user queries about stock forecasts.
"""

import os
import json
import pickle
import logging
import glob
import numpy as np
import pandas as pd

logger = logging.getLogger("predictor")

# Path to ML directory (relative to backend/)
ML_DIR = os.path.join(os.path.dirname(__file__), "..", "ML")
SAVED_DIR = os.path.join(ML_DIR, "saved_models")
DATA_DIR = os.path.join(ML_DIR, "data")


class StockPredictor:
    """Loads trained LSTM/GRU models and provides stock price predictions."""

    def __init__(self):
        self.model = None
        self.gru_model = None
        self.scalers = {}
        self.symbol_to_id = {}
        self.config = {}
        self.loaded = False
        self._load()

    def _load(self):
        """Load saved models, scalers, and config."""
        config_path = os.path.join(SAVED_DIR, "config.json")
        if not os.path.exists(config_path):
            logger.warning(
                "No saved models found at %s. Run 'python ML/train_model.py' first.",
                SAVED_DIR,
            )
            return

        try:
            # Load config
            with open(config_path, "r") as f:
                self.config = json.load(f)

            # Load symbol map
            with open(os.path.join(SAVED_DIR, "symbol_map.json"), "r") as f:
                self.symbol_to_id = json.load(f)

            # Load scalers
            with open(os.path.join(SAVED_DIR, "scalers.pkl"), "rb") as f:
                self.scalers = pickle.load(f)

            # Load models (deferred TF import)
            from tensorflow.keras.models import load_model

            lstm_path = os.path.join(SAVED_DIR, "lstm_model.keras")
            if os.path.exists(lstm_path):
                self.model = load_model(lstm_path)
                logger.info("LSTM model loaded from %s", lstm_path)

            gru_path = os.path.join(SAVED_DIR, "gru_model.keras")
            if os.path.exists(gru_path):
                self.gru_model = load_model(gru_path)
                logger.info("GRU model loaded from %s", gru_path)

            self.loaded = True
            logger.info(
                "StockPredictor ready — %d symbols, LSTM MAE: %.5f",
                len(self.symbol_to_id),
                self.config.get("lstm_mae", -1),
            )

        except Exception as e:
            logger.error("Failed to load models: %s", e)
            self.loaded = False

    def _get_latest_data(self, symbol: str) -> pd.DataFrame | None:
        """Load the latest data for a symbol from its CSV file."""
        csv_path = os.path.join(DATA_DIR, f"{symbol}.csv")
        if not os.path.exists(csv_path):
            # Try case-insensitive search
            pattern = os.path.join(DATA_DIR, "*.csv")
            matches = [
                f for f in glob.glob(pattern)
                if os.path.splitext(os.path.basename(f))[0].upper() == symbol.upper()
            ]
            if matches:
                csv_path = matches[0]
            else:
                return None

        df = pd.read_csv(csv_path)

        # Normalize column names
        date_candidates = ["Date", "date", "published_date", "Published Date"]
        for c in date_candidates:
            if c in df.columns:
                df = df.rename(columns={c: "Date"})
                break

        df["Date"] = pd.to_datetime(df["Date"])
        df = df.sort_values("Date").reset_index(drop=True)

        # Clean & engineer features
        df["per_change"] = df.get("per_change", pd.Series(0, index=df.index)).fillna(0)
        for col in ["open", "high", "low", "traded_quantity"]:
            if col in df.columns:
                df[col] = df[col].ffill().bfill()

        df["ma_7"] = df["close"].rolling(7, min_periods=1).mean()
        df["ma_21"] = df["close"].rolling(21, min_periods=1).mean()
        df["volatility"] = df["close"].rolling(7, min_periods=1).std().fillna(0)
        df["price_range"] = df["high"] - df["low"]

        return df

    def predict(self, symbol: str, model_type: str = "lstm") -> dict | None:
        """
        Predict the next day's closing price for a given stock symbol.
        Returns a dict with prediction details or None if unavailable.
        """
        if not self.loaded:
            return None

        symbol_upper = symbol.upper()
        if symbol_upper not in self.symbol_to_id:
            return None

        df = self._get_latest_data(symbol_upper)
        if df is None:
            return None

        window = self.config.get("window", 60)
        features = self.config.get("features", [])

        if len(df) < window:
            return None

        # Scale using the saved scaler for this symbol
        scaler = self.scalers.get(symbol_upper)
        if scaler is None:
            return None

        # Take the last `window` rows
        recent = df.tail(window).copy()
        recent[features] = recent[features].replace([np.inf, -np.inf], np.nan)
        recent[features] = recent[features].ffill().bfill().fillna(0)

        scaled = scaler.transform(recent[features])
        X_price = np.array([scaled], dtype=np.float32)
        X_symbol = np.array([self.symbol_to_id[symbol_upper]], dtype=np.int32)

        # Pick model
        chosen_model = self.model if model_type == "lstm" else self.gru_model
        if chosen_model is None:
            chosen_model = self.model  # fallback

        if chosen_model is None:
            return None

        # Predict (scaled)
        pred_scaled = chosen_model.predict([X_price, X_symbol], verbose=0)[0][0]

        # Inverse transform to get actual price
        # The target is 'close', which is at index features.index('close') in the scaler
        close_idx = features.index("close")
        dummy = np.zeros((1, len(features)))
        dummy[0, close_idx] = pred_scaled
        inv = scaler.inverse_transform(dummy)
        predicted_price = float(inv[0, close_idx])

        last_close = float(df["close"].iloc[-1])
        last_date = df["Date"].iloc[-1].strftime("%Y-%m-%d")
        pct_change = ((predicted_price - last_close) / last_close) * 100

        return {
            "symbol": symbol_upper,
            "predicted_close": round(predicted_price, 2),
            "last_close": round(last_close, 2),
            "last_date": last_date,
            "predicted_change_pct": round(pct_change, 2),
            "direction": "📈 UP" if pct_change > 0.1 else ("📉 DOWN" if pct_change < -0.1 else "➡️ FLAT"),
            "model_type": model_type.upper(),
            "model_mae": self.config.get(f"{model_type}_mae", None),
        }

    def predict_multiple(self, symbols: list[str], model_type: str = "lstm") -> list[dict]:
        """Predict for multiple symbols."""
        results = []
        for sym in symbols:
            pred = self.predict(sym, model_type)
            if pred:
                results.append(pred)
        return results

    def get_supported_symbols(self) -> list[str]:
        """Return list of symbols the model was trained on."""
        return self.config.get("trained_symbols", [])

    def get_model_info(self) -> dict:
        """Return model metadata."""
        return {
            "loaded": self.loaded,
            "n_symbols": len(self.symbol_to_id),
            "window": self.config.get("window", 60),
            "features": self.config.get("features", []),
            "lstm_mae": self.config.get("lstm_mae"),
            "gru_mae": self.config.get("gru_mae"),
        }


# Singleton — instantiated once when the module is imported
predictor: StockPredictor | None = None


def get_predictor() -> StockPredictor:
    """Get or create the singleton predictor instance."""
    global predictor
    if predictor is None:
        predictor = StockPredictor()
    return predictor
