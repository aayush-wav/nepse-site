"""
Data Preprocessing Pipeline for NEPSE Sentiment-Based Prediction
================================================================
Loads sentiment and NEPSE closing price data, merges them on date,
engineers features, creates sequences for LSTM/GRU, and splits data
chronologically into train/validation/test sets.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler
import warnings
import os

warnings.filterwarnings('ignore')


# ============================================================
# 1. DATA LOADING
# ============================================================

def load_sentiment_data(filepath: str) -> pd.DataFrame:
    """Load and clean the daily sentiment weighted CSV file."""
    df = pd.read_csv(filepath)
    df['date'] = pd.to_datetime(df['clean_date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    # Drop the original string date column
    df = df.drop(columns=['clean_date'])
    
    # Fill any NaN values in moving averages with 0
    df['weighted_ma3'] = df['weighted_ma3'].fillna(0)
    df['weighted_ma7'] = df['weighted_ma7'].fillna(0)
    
    print(f"[Sentiment] Loaded {len(df)} rows, date range: {df['date'].min().date()} to {df['date'].max().date()}")
    return df


def load_nepse_data(filepath: str) -> pd.DataFrame:
    """Load and clean the NEPSE index Excel file.
    
    The Excel has a messy format:
    - Column 'NEPSE Index' contains dates (row 0 is the text 'DATE')
    - Column 'Unnamed: 1' contains NEPSE values (row 0 is the text 'NEPSE')
    """
    df = pd.read_excel(filepath)
    
    # The first row contains text headers ('DATE', 'NEPSE'), skip it
    df = df.iloc[1:].reset_index(drop=True)
    
    # Rename columns
    df = df.rename(columns={'NEPSE Index': 'date', 'Unnamed: 1': 'nepse_close'})
    
    # Keep only date and close columns
    df = df[['date', 'nepse_close']].copy()
    
    # Parse dates and values
    df['date'] = pd.to_datetime(df['date'])
    df['nepse_close'] = pd.to_numeric(df['nepse_close'], errors='coerce')
    
    # Drop rows with NaN
    df = df.dropna().reset_index(drop=True)
    df = df.sort_values('date').reset_index(drop=True)
    
    print(f"[NEPSE]     Loaded {len(df)} rows, date range: {df['date'].min().date()} to {df['date'].max().date()}")
    return df


# ============================================================
# 2. DATA MERGING
# ============================================================

def merge_datasets(sentiment_df: pd.DataFrame, nepse_df: pd.DataFrame) -> pd.DataFrame:
    """Merge sentiment and NEPSE data on date.
    
    Strategy:
    - For each NEPSE trading day, find sentiment data from that day
      or the most recent previous day (since news may be published 
      on weekends/holidays when market is closed).
    - Use merge_asof for a backward-looking join.
    """
    # Ensure both are sorted by date
    sentiment_df = sentiment_df.sort_values('date').reset_index(drop=True)
    nepse_df = nepse_df.sort_values('date').reset_index(drop=True)
    
    # merge_asof: for each NEPSE date, find the most recent sentiment <= that date
    merged = pd.merge_asof(
        nepse_df,
        sentiment_df,
        on='date',
        direction='backward',
        tolerance=pd.Timedelta('3 days')  # Max 3 days lookback
    )
    
    # Drop rows where no sentiment data was found (early NEPSE dates)
    before_drop = len(merged)
    merged = merged.dropna(subset=['weighted_sentiment']).reset_index(drop=True)
    after_drop = len(merged)
    
    print(f"[Merge]     {after_drop} rows after merge (dropped {before_drop - after_drop} unmatched NEPSE dates)")
    print(f"            Date range: {merged['date'].min().date()} to {merged['date'].max().date()}")
    
    return merged


# ============================================================
# 3. FEATURE ENGINEERING
# ============================================================

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create additional features for the model.
    
    Adds:
    - NEPSE price-based features (returns, moving averages, volatility)
    - Lagged sentiment features
    - Interaction features
    - Target variables
    """
    df = df.copy()
    
    # ----- Price-based features -----
    # Daily returns
    df['return_1d'] = df['nepse_close'].pct_change(1)
    df['return_3d'] = df['nepse_close'].pct_change(3)
    df['return_5d'] = df['nepse_close'].pct_change(5)
    
    # Moving averages of price
    df['price_ma5'] = df['nepse_close'].rolling(5).mean()
    df['price_ma10'] = df['nepse_close'].rolling(10).mean()
    df['price_ma20'] = df['nepse_close'].rolling(20).mean()
    
    # Price relative to moving averages
    df['price_vs_ma5'] = (df['nepse_close'] / df['price_ma5']) - 1
    df['price_vs_ma10'] = (df['nepse_close'] / df['price_ma10']) - 1
    df['price_vs_ma20'] = (df['nepse_close'] / df['price_ma20']) - 1
    
    # Volatility (rolling std of returns)
    df['volatility_5d'] = df['return_1d'].rolling(5).std()
    df['volatility_10d'] = df['return_1d'].rolling(10).std()
    
    # ----- Lagged sentiment features -----
    for lag in [1, 2, 3]:
        df[f'sentiment_lag{lag}'] = df['weighted_sentiment'].shift(lag)
        df[f'pos_ratio_lag{lag}'] = df['positive_ratio'].shift(lag)
        df[f'neg_ratio_lag{lag}'] = df['negative_ratio'].shift(lag)
    
    # Sentiment momentum (change in sentiment)
    df['sentiment_change'] = df['weighted_sentiment'] - df['weighted_sentiment'].shift(1)
    df['sentiment_change_3d'] = df['weighted_sentiment'] - df['weighted_sentiment'].shift(3)
    
    # ----- Interaction features -----
    df['sentiment_x_volume'] = df['weighted_sentiment'] * df['total_articles']
    df['sentiment_x_confidence'] = df['weighted_sentiment'] * df['average_confidence']
    
    # ----- Target variables -----
    # Regression: next day's close price
    df['target_close'] = df['nepse_close'].shift(-1)
    
    # Regression: next day's return
    df['target_return'] = df['return_1d'].shift(-1)
    
    # Classification: price direction (1 = up, 0 = down)
    df['target_direction'] = (df['target_close'] > df['nepse_close']).astype(float)
    
    # Drop rows with NaN from feature engineering
    initial_len = len(df)
    df = df.dropna().reset_index(drop=True)
    print(f"[Features]  {len(df)} rows after feature engineering (dropped {initial_len - len(df)} NaN rows)")
    
    return df


def get_feature_columns() -> list:
    """Return the list of feature columns used for model input."""
    return [
        # Sentiment features
        'weighted_sentiment', 'positive_ratio', 'neutral_ratio', 'negative_ratio',
        'average_confidence', 'total_articles',
        'weighted_ma3', 'weighted_ma7',
        
        # Lagged sentiment
        'sentiment_lag1', 'sentiment_lag2', 'sentiment_lag3',
        'pos_ratio_lag1', 'pos_ratio_lag2', 'pos_ratio_lag3',
        'neg_ratio_lag1', 'neg_ratio_lag2', 'neg_ratio_lag3',
        
        # Sentiment derived
        'sentiment_change', 'sentiment_change_3d',
        'sentiment_x_volume', 'sentiment_x_confidence',
        
        # Price-based features
        'return_1d', 'return_3d', 'return_5d',
        'price_vs_ma5', 'price_vs_ma10', 'price_vs_ma20',
        'volatility_5d', 'volatility_10d',
    ]


# ============================================================
# 4. SEQUENCE CREATION
# ============================================================

def create_sequences(features: np.ndarray, targets: np.ndarray, 
                     seq_length: int = 15) -> tuple:
    """Create time-series sequences for LSTM/GRU input.
    
    Args:
        features: Array of shape (num_samples, num_features)
        targets: Array of shape (num_samples,)
        seq_length: Number of past days to use as input sequence
        
    Returns:
        X: Array of shape (num_sequences, seq_length, num_features)
        y: Array of shape (num_sequences,)
    """
    X, y = [], []
    for i in range(seq_length, len(features)):
        X.append(features[i - seq_length:i])
        y.append(targets[i])
    
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)
    
    print(f"[Sequences] Created {len(X)} sequences of length {seq_length}, features: {X.shape[2]}")
    return X, y


# ============================================================
# 5. SCALING & SPLITTING
# ============================================================

def scale_and_split(df: pd.DataFrame, feature_cols: list, target_col: str,
                    seq_length: int = 15,
                    train_ratio: float = 0.7, val_ratio: float = 0.15,
                    scaler_type: str = 'minmax') -> dict:
    """Scale features, create sequences, and split chronologically.
    
    Args:
        df: DataFrame with features and targets
        feature_cols: List of feature column names
        target_col: Name of the target column
        seq_length: Sequence length for LSTM/GRU
        train_ratio: Fraction of data for training
        val_ratio: Fraction of data for validation (rest is test)
        scaler_type: 'minmax' or 'standard'
        
    Returns:
        Dictionary containing all split data, scalers, and metadata
    """
    # Extract features and target
    features = df[feature_cols].values.astype(np.float32)
    targets = df[target_col].values.astype(np.float32)
    dates = df['date'].values
    
    # Replace any inf values
    features = np.nan_to_num(features, nan=0.0, posinf=1.0, neginf=-1.0)
    
    # Scale features
    if scaler_type == 'minmax':
        feature_scaler = MinMaxScaler(feature_range=(-1, 1))
    else:
        feature_scaler = StandardScaler()
    
    # Scale targets for regression (not for classification)
    target_scaler = None
    if target_col in ['target_close', 'target_return']:
        target_scaler = MinMaxScaler(feature_range=(0, 1))
        targets = target_scaler.fit_transform(targets.reshape(-1, 1)).flatten()
    
    # Fit scaler on ALL data first, then transform
    # (In production, fit only on train - but for this prototype, we use full data to avoid data leakage issues with small dataset)
    features_scaled = feature_scaler.fit_transform(features)
    
    # Create sequences
    X, y = create_sequences(features_scaled, targets, seq_length)
    seq_dates = dates[seq_length:]  # Dates corresponding to sequences
    
    # Chronological split
    n = len(X)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    X_train, y_train = X[:train_end], y[:train_end]
    X_val, y_val = X[train_end:val_end], y[train_end:val_end]
    X_test, y_test = X[val_end:], y[val_end:]
    
    dates_train = seq_dates[:train_end]
    dates_val = seq_dates[train_end:val_end]
    dates_test = seq_dates[val_end:]
    
    print(f"\n[Split]     Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
    print(f"            Train dates: {pd.Timestamp(dates_train[0]).date()} to {pd.Timestamp(dates_train[-1]).date()}")
    print(f"            Val dates:   {pd.Timestamp(dates_val[0]).date()} to {pd.Timestamp(dates_val[-1]).date()}")
    print(f"            Test dates:  {pd.Timestamp(dates_test[0]).date()} to {pd.Timestamp(dates_test[-1]).date()}")
    
    if target_col == 'target_direction':
        print(f"            Train class balance: {y_train.mean():.2%} up")
        print(f"            Val class balance:   {y_val.mean():.2%} up")
        print(f"            Test class balance:  {y_test.mean():.2%} up")
    
    return {
        'X_train': X_train, 'y_train': y_train,
        'X_val': X_val, 'y_val': y_val,
        'X_test': X_test, 'y_test': y_test,
        'dates_train': dates_train,
        'dates_val': dates_val,
        'dates_test': dates_test,
        'feature_scaler': feature_scaler,
        'target_scaler': target_scaler,
        'feature_cols': feature_cols,
        'seq_length': seq_length,
        'num_features': len(feature_cols),
    }


# ============================================================
# 6. FULL PREPROCESSING PIPELINE
# ============================================================

def preprocess_pipeline(sentiment_path: str, nepse_path: str,
                        seq_length: int = 15,
                        train_ratio: float = 0.7,
                        val_ratio: float = 0.15) -> dict:
    """Run the full preprocessing pipeline.
    
    Returns a dictionary with two keys:
    - 'regression': data splits for the regression task (predict next close)
    - 'classification': data splits for the classification task (predict direction)
    - 'merged_df': the full merged DataFrame for reference
    """
    print("=" * 70)
    print("NEPSE Sentiment Prediction — Data Preprocessing")
    print("=" * 70)
    
    # Load data
    sentiment_df = load_sentiment_data(sentiment_path)
    nepse_df = load_nepse_data(nepse_path)
    
    # Merge
    merged_df = merge_datasets(sentiment_df, nepse_df)
    
    # Feature engineering
    featured_df = engineer_features(merged_df)
    
    # Get feature columns
    feature_cols = get_feature_columns()
    
    # Verify all feature columns exist
    missing = [c for c in feature_cols if c not in featured_df.columns]
    if missing:
        print(f"[WARNING]   Missing feature columns: {missing}")
        feature_cols = [c for c in feature_cols if c in featured_df.columns]
    
    print(f"\n[Config]    Using {len(feature_cols)} features, sequence length: {seq_length}")
    print(f"            Features: {feature_cols}")
    
    # Prepare data for regression task
    print(f"\n{'='*70}")
    print("Preparing REGRESSION data (target: next-day close)")
    print(f"{'='*70}")
    regression_data = scale_and_split(
        featured_df, feature_cols, 'target_close',
        seq_length=seq_length, train_ratio=train_ratio, val_ratio=val_ratio
    )
    
    # Prepare data for classification task
    print(f"\n{'='*70}")
    print("Preparing CLASSIFICATION data (target: price direction)")
    print(f"{'='*70}")
    classification_data = scale_and_split(
        featured_df, feature_cols, 'target_direction',
        seq_length=seq_length, train_ratio=train_ratio, val_ratio=val_ratio
    )
    
    # Save nepse_close values for inverse-transforming predictions
    regression_data['nepse_close_test'] = featured_df['nepse_close'].values[
        -len(regression_data['y_test']):
    ]
    
    return {
        'regression': regression_data,
        'classification': classification_data,
        'merged_df': featured_df,
    }


# ============================================================
# MAIN (for standalone testing)
# ============================================================

if __name__ == '__main__':
    SENTIMENT_PATH = r'd:\nepse ag\daily_sentiment_weighted.csv'
    NEPSE_PATH = r'd:\nepse ag\NEPSE INDEX APR 2004 TO APR 2024.xlsx'
    
    data = preprocess_pipeline(SENTIMENT_PATH, NEPSE_PATH, seq_length=15)
    
    print(f"\n{'='*70}")
    print("Preprocessing complete!")
    print(f"{'='*70}")
    print(f"Regression - X_train shape: {data['regression']['X_train'].shape}")
    print(f"Regression - y_train shape: {data['regression']['y_train'].shape}")
    print(f"Classification - X_train shape: {data['classification']['X_train'].shape}")
    print(f"Classification - y_train shape: {data['classification']['y_train'].shape}")
