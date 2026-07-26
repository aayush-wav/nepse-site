import pandas as pd
import numpy as np

df = pd.read_csv("nepse_index.csv")

# Remove useless column
df = df.drop(columns=["Unnamed: 2"])

# Parse date
df["DATE"] = pd.to_datetime(
    df["DATE"],
    format="%d-%b-%y"
)

# Sort oldest → newest
df = df.sort_values("DATE")

# Daily return
df["return"] = df["NEPSE"].pct_change()

# Lag features
df["lag1"] = df["NEPSE"].shift(1)
df["lag2"] = df["NEPSE"].shift(2)
df["lag3"] = df["NEPSE"].shift(3)
df["lag7"] = df["NEPSE"].shift(7)

# Moving averages
df["ma5"] = df["NEPSE"].rolling(5).mean()
df["ma10"] = df["NEPSE"].rolling(10).mean()
df["ma20"] = df["NEPSE"].rolling(20).mean()

# Volatility
df["volatility"] = (
    df["return"]
    .rolling(20)
    .std()
)

# Target = next day's index
df["target"] = df["NEPSE"].shift(-1)

df = df.dropna()

print(df.head())

print("\nRows:", len(df))

df.to_csv(
    "nepse_features.csv",
    index=False
)

print("\nSaved!")