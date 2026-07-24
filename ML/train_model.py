"""
ML Training Script for NEPSE Stock Prediction
Extracts the pipeline from Model.ipynb into a standalone, runnable script.
Trains LSTM & GRU models and saves them for the backend predictor.
"""

import os
import sys
import glob
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

# ── Configuration ────────────────────────────────────────────────────────────
WINDOW = 60
FEATURES = [
    "open", "high", "low", "close", "per_change", "traded_quantity",
    "ma_7", "ma_21", "volatility", "price_range",
]
TARGET = "close"
MIN_YEAR = 2015

DATE_CANDIDATES = ["Date", "date", "published_date", "Published Date"]
SYMBOL_CANDIDATES = ["Symbol", "symbol", "Company", "company", "ticker", "Ticker"]

SAVE_DIR = os.path.join(os.path.dirname(__file__), "saved_models")


# ── Column Resolution ────────────────────────────────────────────────────────
def _resolve_column(df, candidates, role):
    for c in candidates:
        if c in df.columns:
            return c
    raise KeyError(
        f"Could not find a {role} column. Tried {candidates}, "
        f"but the DataFrame only has: {df.columns.tolist()}"
    )


def normalize_columns(df, filepath=None):
    df = df.copy()
    date_col = _resolve_column(df, DATE_CANDIDATES, "date")
    if date_col != "Date":
        df = df.rename(columns={date_col: "Date"})
    df["Date"] = pd.to_datetime(df["Date"])

    symbol_col = None
    for c in SYMBOL_CANDIDATES:
        if c in df.columns:
            symbol_col = c
            break

    if symbol_col is not None:
        if symbol_col != "Symbol":
            df = df.rename(columns={symbol_col: "Symbol"})
    else:
        if filepath is None:
            raise KeyError("No symbol column found and no filepath to derive one.")
        inferred = os.path.splitext(os.path.basename(filepath))[0]
        df["Symbol"] = inferred

    return df


# ── Load & Clean ──────────────────────────────────────────────────────────────
def load_stock_data(filepath):
    df = pd.read_csv(filepath)
    df = normalize_columns(df, filepath=filepath)
    df.sort_values("Date", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def load_and_clean(df):
    df = df.copy()
    df = df.sort_values("Date").reset_index(drop=True)
    df = df.drop_duplicates(subset=["Symbol", "Date"])
    df = df[df["Date"].dt.year >= MIN_YEAR]
    df.dropna(subset=["close"], inplace=True)

    for col in ["traded_amount", "status"]:
        if col in df.columns:
            df.drop(columns=[col], inplace=True)

    df["per_change"] = df["per_change"].fillna(0.0)
    for col in ["open", "high", "low", "traded_quantity"]:
        if col in df.columns:
            df[col] = df[col].ffill().bfill()

    df["ma_7"] = df.groupby("Symbol")["close"].transform(
        lambda x: x.rolling(7, min_periods=1).mean()
    )
    df["ma_21"] = df.groupby("Symbol")["close"].transform(
        lambda x: x.rolling(21, min_periods=1).mean()
    )
    df["volatility"] = df.groupby("Symbol")["close"].transform(
        lambda x: x.rolling(7, min_periods=1).std().fillna(0)
    )
    df["price_range"] = df["high"] - df["low"]
    return df


# ── Encode & Split ────────────────────────────────────────────────────────────
def encode_categoricals(df):
    df = df.copy()
    symbols = sorted(df["Symbol"].unique())
    symbol_to_id = {s: i for i, s in enumerate(symbols)}
    df["SymbolID"] = df["Symbol"].map(symbol_to_id)
    return df, len(symbols), symbol_to_id


def split_and_scale_per_company(df, features=FEATURES, train_frac=0.7, val_frac=0.15):
    out_frames = []
    scalers = {}

    for symbol, group in df.groupby("Symbol"):
        group = group.sort_values("Date").reset_index(drop=True)
        n = len(group)
        train_end = int(n * train_frac)
        val_end = int(n * (train_frac + val_frac))

        group["Split"] = "train"
        group.loc[train_end:val_end, "Split"] = "val"
        group.loc[val_end:, "Split"] = "test"

        scaler = MinMaxScaler()
        group[features] = group[features].replace([np.inf, -np.inf], np.nan)
        group[features] = group[features].ffill().bfill().fillna(0)

        train_rows = group[group["Split"] == "train"]
        if len(train_rows) == 0:
            continue

        scaler.fit(train_rows[features])
        scalers[symbol] = scaler

        scaled = scaler.transform(group[features])
        for i, feat in enumerate(features):
            group[f"{feat}_scaled"] = scaled[:, i]

        out_frames.append(group)

    return pd.concat(out_frames, ignore_index=True), scalers


def build_sequences(df, window=WINDOW, features=FEATURES, target=TARGET, split="train"):
    scaled_features = [f"{f}_scaled" for f in features]
    target_scaled = f"{target}_scaled"

    X_price, X_symbol, y = [], [], []

    for symbol, group in df.groupby("Symbol"):
        group = group.sort_values("Date").reset_index(drop=True)
        subset = group[group["Split"] == split]
        if len(subset) <= window:
            continue

        arr = subset[scaled_features].values
        target_arr = subset[target_scaled].values
        symbol_id = subset["SymbolID"].iloc[0]

        for i in range(len(arr) - window):
            X_price.append(arr[i : i + window])
            X_symbol.append(symbol_id)
            y.append(target_arr[i + window])

    return (
        np.array(X_price, dtype=np.float32),
        np.array(X_symbol, dtype=np.int32),
        np.array(y, dtype=np.float32),
    )


# ── Model ─────────────────────────────────────────────────────────────────────
def build_model(window, n_features, n_symbols, rnn_type="LSTM"):
    # Deferred import so the script can be imported without TF loaded
    from tensorflow.keras.layers import (
        Input, Embedding, Flatten, LSTM, GRU,
        Concatenate, Dense, Dropout,
    )
    from tensorflow.keras.models import Model

    RNN = LSTM if rnn_type == "LSTM" else GRU

    price_input = Input(shape=(window, n_features), name="price_seq")
    x = RNN(64, return_sequences=True)(price_input)
    x = Dropout(0.2)(x)
    x = RNN(32)(x)

    symbol_input = Input(shape=(1,), name="symbol_id")
    s = Embedding(input_dim=n_symbols, output_dim=8)(symbol_input)
    s = Flatten()(s)

    combined = Concatenate()([x, s])
    combined = Dense(32, activation="relu")(combined)
    combined = Dropout(0.2)(combined)
    output = Dense(1, name="next_close")(combined)

    model = Model(
        inputs=[price_input, symbol_input],
        outputs=output,
        name=f"nepse_{rnn_type.lower()}",
    )
    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    return model


# ── Main Training ─────────────────────────────────────────────────────────────
def main(data_folder=None, epochs=30, batch_size=32):
    if data_folder is None:
        data_folder = os.path.join(os.path.dirname(__file__), "data")

    csv_files = glob.glob(os.path.join(data_folder, "*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No CSV files found in {data_folder}")

    print(f"Found {len(csv_files)} CSV files. Loading...")
    all_dfs = []
    for f in csv_files:
        try:
            all_dfs.append(load_stock_data(f))
        except Exception as e:
            print(f"  Skipping {f}: {e}")

    df = pd.concat(all_dfs, ignore_index=True)
    print(f"Loaded {len(df)} rows, {df['Symbol'].nunique()} symbols")

    df = load_and_clean(df)
    df, n_symbols, symbol_to_id = encode_categoricals(df)
    df, scalers = split_and_scale_per_company(df)

    # Build sequences
    print("Building sequences...")
    Xp_train, Xs_train, y_train = build_sequences(df, split="train")
    Xp_val, Xs_val, y_val = build_sequences(df, split="val")
    Xp_test, Xs_test, y_test = build_sequences(df, split="test")

    print(f"Train: {Xp_train.shape}, Val: {Xp_val.shape}, Test: {Xp_test.shape}")

    if Xp_train.shape[0] == 0:
        raise ValueError("No training sequences produced. Check data quality.")

    # Train LSTM
    print("\n" + "=" * 60)
    print("Training LSTM model...")
    print("=" * 60)
    lstm_model = build_model(WINDOW, len(FEATURES), n_symbols, rnn_type="LSTM")
    lstm_model.fit(
        [Xp_train, Xs_train], y_train,
        validation_data=([Xp_val, Xs_val], y_val),
        epochs=epochs, batch_size=batch_size,
    )

    # Train GRU
    print("\n" + "=" * 60)
    print("Training GRU model...")
    print("=" * 60)
    gru_model = build_model(WINDOW, len(FEATURES), n_symbols, rnn_type="GRU")
    gru_model.fit(
        [Xp_train, Xs_train], y_train,
        validation_data=([Xp_val, Xs_val], y_val),
        epochs=epochs, batch_size=batch_size,
    )

    # Evaluate
    lstm_loss, lstm_mae = lstm_model.evaluate([Xp_test, Xs_test], y_test)
    gru_loss, gru_mae = gru_model.evaluate([Xp_test, Xs_test], y_test)

    print(f"\nLSTM test MAE: {lstm_mae:.5f}")
    print(f"GRU  test MAE: {gru_mae:.5f}")

    # Save everything
    os.makedirs(SAVE_DIR, exist_ok=True)

    lstm_path = os.path.join(SAVE_DIR, "lstm_model.keras")
    gru_path = os.path.join(SAVE_DIR, "gru_model.keras")
    lstm_model.save(lstm_path)
    gru_model.save(gru_path)
    print(f"Saved LSTM model to {lstm_path}")
    print(f"Saved GRU model to {gru_path}")

    scalers_path = os.path.join(SAVE_DIR, "scalers.pkl")
    with open(scalers_path, "wb") as f:
        pickle.dump(scalers, f)
    print(f"Saved scalers to {scalers_path}")

    symbol_map_path = os.path.join(SAVE_DIR, "symbol_map.json")
    with open(symbol_map_path, "w") as f:
        json.dump(symbol_to_id, f, indent=2)
    print(f"Saved symbol map to {symbol_map_path}")

    config = {
        "window": WINDOW,
        "features": FEATURES,
        "target": TARGET,
        "n_symbols": n_symbols,
        "lstm_mae": float(lstm_mae),
        "gru_mae": float(gru_mae),
        "trained_symbols": sorted(symbol_to_id.keys()),
    }
    config_path = os.path.join(SAVE_DIR, "config.json")
    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)
    print(f"Saved config to {config_path}")

    print("\n[SUCCESS] Training complete! Models saved to ML/saved_models/")
    return config


if __name__ == "__main__":
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 30
    main(epochs=epochs)
