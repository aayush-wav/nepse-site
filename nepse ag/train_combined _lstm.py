import numpy as np
import joblib
import matplotlib.pyplot as plt
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

X = np.load("X_combined.npy")
y = np.load("y_combined.npy")

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

plt.figure(figsize=(10,5))

plt.plot(
    history.history["loss"],
    label="Training Loss"
)

plt.plot(
    history.history["val_loss"],
    label="Validation Loss"
)

plt.title("Training vs Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("MSE Loss")

plt.legend()

plt.show()
# ==========================
# Predict
# ==========================

pred = model.predict(X_test)

# ==========================
# Inverse scaling
# ==========================

scaler_y = joblib.load(
    "combined_scaler_y.pkl"
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

model.save("combined_lstm.keras")



# ==========================
# Plot Actual vs Predicted
# ==========================

plt.figure(figsize=(12,6))

plt.plot(
    y_real,
    label="Actual"
)

plt.plot(
    pred_real,
    label="Predicted"
)

plt.title("Actual vs Predicted NEPSE")
plt.xlabel("Test Samples")
plt.ylabel("NEPSE Index")

plt.legend()

plt.show()

# ==========================
# Residual (Error) Analysis
# ==========================

errors = y_real.flatten() - pred_real.flatten()

plt.figure(figsize=(12,6))

plt.scatter(
    pred_real,
    errors,
    alpha=0.6
)

plt.axhline(
    y=0,
    linestyle="--"
)

plt.title("Residual Error Plot")
plt.xlabel("Predicted NEPSE")
plt.ylabel("Residual Error (Actual - Predicted)")

plt.show()