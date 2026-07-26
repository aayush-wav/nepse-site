import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
import joblib

df = pd.read_csv("nepse_features.csv")

features = [
    "NEPSE",
    "return",
    "lag1",
    "lag2",
    "lag3",
    "lag7",
    "ma5",
    "ma10",
    "ma20",
    "volatility"
]

target = "target"

X_data = df[features].values
y_data = df[target].values

scaler_x = MinMaxScaler()
scaler_y = MinMaxScaler()

X_scaled = scaler_x.fit_transform(X_data)
y_scaled = scaler_y.fit_transform(
    y_data.reshape(-1, 1)
)

joblib.dump(
    scaler_x,
    "nepse_scaler_x.pkl"
)

joblib.dump(
    scaler_y,
    "nepse_scaler_y.pkl"
)

sequence_length = 30

X = []
y = []

for i in range(
    sequence_length,
    len(X_scaled)
):
    X.append(
        X_scaled[
            i-sequence_length:i
        ]
    )

    y.append(
        y_scaled[i]
    )

X = np.array(X)
y = np.array(y)

print("X shape:", X.shape)
print("y shape:", y.shape)

np.save("X_nepse.npy", X)
np.save("y_nepse.npy", y)

print("Done.")