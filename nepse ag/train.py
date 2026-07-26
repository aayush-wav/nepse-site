"""
PyTorch Training Pipeline
=========================

Provides a complete training pipeline including early stopping,
model training with learning rate scheduling, and data loader creation.
"""

import copy
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset


class EarlyStopping:
    """Monitors validation loss and stops training when improvement stalls.

    Tracks the best validation loss observed so far and signals when training
    should stop if no meaningful improvement has been seen for ``patience``
    consecutive calls to :meth:`step`.

    Args:
        patience: Number of steps without improvement before stopping.
            Defaults to ``15``.
        min_delta: Minimum decrease in validation loss to qualify as an
            improvement. Defaults to ``1e-4``.
    """

    def __init__(self, patience: int = 15, min_delta: float = 1e-4) -> None:
        self.patience = patience
        self.min_delta = min_delta

        self._best_loss: Optional[float] = None
        self._best_state_dict: Optional[Dict[str, Any]] = None
        self._counter: int = 0

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def step(self, val_loss: float, model: nn.Module) -> bool:
        """Record a new validation loss and decide whether to stop.

        If *val_loss* improves on the current best by at least
        ``min_delta``, the internal counter resets and the best model
        state dict is saved.  Otherwise the counter increments.

        Args:
            val_loss: Validation loss for the current epoch.
            model: The model being trained.  Its ``state_dict`` is
                deep-copied whenever a new best loss is recorded.

        Returns:
            ``True`` if training should stop (patience exhausted),
            ``False`` otherwise.
        """
        if self._best_loss is None or val_loss < self._best_loss - self.min_delta:
            self._best_loss = val_loss
            self._best_state_dict = copy.deepcopy(model.state_dict())
            self._counter = 0
            return False

        self._counter += 1
        return self._counter >= self.patience

    def get_best_model(self) -> Optional[Dict[str, Any]]:
        """Return the state dict corresponding to the lowest validation loss.

        Returns:
            A deep-copied ``state_dict``, or ``None`` if :meth:`step` has
            never been called.
        """
        return self._best_state_dict


def create_data_loaders(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    batch_size: int = 32,
) -> Tuple[DataLoader, DataLoader]:
    """Convert NumPy arrays into PyTorch :class:`DataLoader` instances.

    All arrays are cast to ``torch.float32``.

    Args:
        X_train: Training features.
        y_train: Training targets.
        X_val: Validation features.
        y_val: Validation targets.
        batch_size: Mini-batch size for both loaders. Defaults to ``32``.

    Returns:
        A ``(train_loader, val_loader)`` tuple.  The training loader is
        shuffled; the validation loader is not.
    """
    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32)

    train_dataset = TensorDataset(X_train_t, y_train_t)
    val_dataset = TensorDataset(X_val_t, y_val_t)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    return train_loader, val_loader


def train_model(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    config: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, List[float]]]:
    """Train a PyTorch model with early stopping and LR scheduling.

    Args:
        model: The network to train.
        train_loader: DataLoader for the training set.
        val_loader: DataLoader for the validation set.
        config: Training hyper-parameters.  Recognised keys:

            * **lr** (*float*) – Learning rate. Default ``0.001``.
            * **epochs** (*int*) – Maximum number of epochs. Default ``200``.
            * **weight_decay** (*float*) – L2 penalty. Default ``1e-5``.
            * **task** (*str*) – ``"regression"`` or ``"classification"``.
              Default ``"regression"``.
            * **device** (*str*) – e.g. ``"cuda"`` or ``"cpu"``.
              Default auto-detected.

    Returns:
        A tuple ``(best_state_dict, history)`` where *history* contains:

        * ``train_loss`` – per-epoch training losses.
        * ``val_loss``   – per-epoch validation losses.
        * ``learning_rates`` – per-epoch learning rates.
    """

    # ---- unpack config with sensible defaults ----
    lr: float = config.get("lr", 0.001)
    epochs: int = config.get("epochs", 200)
    weight_decay: float = config.get("weight_decay", 1e-5)
    task: str = config.get("task", "regression")
    device_name: str = config.get(
        "device", "cuda" if torch.cuda.is_available() else "cpu"
    )
    device = torch.device(device_name)

    model = model.to(device)

    # ---- loss function ----
    if task == "classification":
        criterion = nn.BCELoss()
    else:
        criterion = nn.MSELoss()

    # ---- optimizer & scheduler ----
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", patience=7, factor=0.5
    )

    early_stopping = EarlyStopping(patience=15)

    # ---- training history ----
    history: Dict[str, List[float]] = {
        "train_loss": [],
        "val_loss": [],
        "learning_rates": [],
    }

    # ---- training loop ----
    for epoch in range(1, epochs + 1):
        # --- train phase ---
        model.train()
        running_loss = 0.0
        num_batches = 0

        for X_batch, y_batch in train_loader:
            X_batch, y_batch = X_batch.to(device), y_batch.to(device)

            optimizer.zero_grad()
            predictions = model(X_batch)

            # Ensure shapes match for loss computation
            if predictions.shape != y_batch.shape:
                predictions = predictions.view_as(y_batch)

            loss = criterion(predictions, y_batch)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()
            num_batches += 1

        train_loss = running_loss / max(num_batches, 1)

        # --- validation phase ---
        model.eval()
        val_running_loss = 0.0
        val_batches = 0

        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch, y_batch = X_batch.to(device), y_batch.to(device)
                predictions = model(X_batch)

                if predictions.shape != y_batch.shape:
                    predictions = predictions.view_as(y_batch)

                loss = criterion(predictions, y_batch)
                val_running_loss += loss.item()
                val_batches += 1

        val_loss = val_running_loss / max(val_batches, 1)

        # --- record history ---
        current_lr = optimizer.param_groups[0]["lr"]
        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["learning_rates"].append(current_lr)

        # --- scheduler step ---
        scheduler.step(val_loss)

        # --- progress logging (every 10 epochs) ---
        if epoch % 10 == 0 or epoch == 1:
            print(
                f"Epoch {epoch:>4d}/{epochs}  |  "
                f"Train Loss: {train_loss:.6f}  |  "
                f"Val Loss: {val_loss:.6f}  |  "
                f"LR: {current_lr:.2e}"
            )

        # --- early stopping ---
        if early_stopping.step(val_loss, model):
            print(
                f"Early stopping triggered at epoch {epoch}. "
                f"Best val loss: {early_stopping._best_loss:.6f}"
            )
            break

    best_state_dict = early_stopping.get_best_model()

    # Fallback: if early stopping never saved (should not happen), use
    # the current model state.
    if best_state_dict is None:
        best_state_dict = copy.deepcopy(model.state_dict())

    return best_state_dict, history
