import numpy as np
import joblib

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    LSTM,
    Dense,
    Dropout
)

# ==========================
# Load data
# ==========================

X = np.load("X_nepse.npy")
y = np.load("y_nepse.npy")

print("X:", X.shape)
print("y:", y.shape)

# ==========================
# Train/Test split
# ==========================

split = int(len(X) * 0.8)

X_train = X[:split]
X_test = X[split:]

y_train = y[:split]
y_test = y[split:]

print("\nTrain:", len(X_train))
print("Test :", len(X_test))

# ==========================
# Model
# ==========================

model = Sequential()

model.add(
    LSTM(
        64,
        return_sequences=True,
        input_shape=(
            X.shape[1],
            X.shape[2]
        )
    )
)

model.add(Dropout(0.2))

model.add(
    LSTM(32)
)

model.add(Dropout(0.2))

model.add(Dense(1))

model.compile(
    optimizer="adam",
    loss="mse"
)

# ==========================
# Train
# ==========================

history = model.fit(
    X_train,
    y_train,
    epochs=20,
    batch_size=32,
    validation_split=0.1,
    verbose=1
)

# ==========================
# Predict
# ==========================

pred = model.predict(X_test)

# ==========================
# Inverse scaling
# ==========================

scaler_y = joblib.load(
    "nepse_scaler_y.pkl"
)

pred_real = scaler_y.inverse_transform(pred)

y_real = scaler_y.inverse_transform(
    y_test.reshape(-1,1)
)

# ==========================
# Metrics
# ==========================

mae = mean_absolute_error(
    y_real,
    pred_real
)

rmse = np.sqrt(
    mean_squared_error(
        y_real,
        pred_real
    )
)

r2 = r2_score(
    y_real,
    pred_real
)

print("\n===================")
print("MAE :", round(mae,4))
print("RMSE:", round(rmse,4))
print("R²  :", round(r2,4))
print("===================")

model.save(
    "nepse_lstm.keras"
)