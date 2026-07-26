"""
models.py - PyTorch Recurrent Neural Network Models for NEPSE Stock Index Prediction

This module provides three RNN-based architectures for time-series forecasting
of the Nepal Stock Exchange (NEPSE) index:

    1. LSTMModel  - Two-layer LSTM with dense head
    2. GRUModel   - Two-layer GRU with dense head
    3. HybridModel - LSTM first layer → GRU second layer with dense head

All models support both regression (linear output) and binary classification
(sigmoid output) via the ``task`` parameter.

Example usage::

    model = LSTMModel(input_size=10, hidden_sizes=[128, 64], task='regression')
    predictions = model(batch)  # batch shape: (B, seq_len, 10) → output: (B, 1)
"""

from __future__ import annotations

from typing import Literal

import torch
import torch.nn as nn


# ---------------------------------------------------------------------------
# Weight initialisation helpers
# ---------------------------------------------------------------------------

def _init_linear_weights(module: nn.Linear) -> None:
    """Apply Xavier uniform initialisation to a linear layer.

    Xavier (Glorot) initialisation keeps the variance of activations
    roughly equal across layers, which is well-suited for layers
    followed by sigmoid / tanh or used as the final projection.

    Args:
        module: A ``nn.Linear`` layer whose weights and bias will be
            initialised in-place.
    """
    nn.init.xavier_uniform_(module.weight)
    if module.bias is not None:
        nn.init.zeros_(module.bias)


def _init_recurrent_weights(rnn: nn.Module) -> None:
    """Apply orthogonal initialisation to all recurrent (hidden-hidden) weight
    matrices of an LSTM or GRU layer, and zero-initialise biases.

    Orthogonal initialisation helps mitigate vanishing / exploding gradients
    in recurrent networks by preserving gradient norms through time steps.

    Args:
        rnn: An ``nn.LSTM`` or ``nn.GRU`` module.
    """
    for name, param in rnn.named_parameters():
        if "weight_hh" in name:
            # Hidden-to-hidden weights → orthogonal
            nn.init.orthogonal_(param.data)
        elif "weight_ih" in name:
            # Input-to-hidden weights → Xavier uniform
            nn.init.xavier_uniform_(param.data)
        elif "bias" in name:
            nn.init.zeros_(param.data)


# ---------------------------------------------------------------------------
# Base model
# ---------------------------------------------------------------------------

class _BaseRecurrentModel(nn.Module):
    """Abstract base class that encapsulates the shared dense head, batch
    normalisation, dropout, weight-init logic and the ``task`` switch used
    by all three concrete model classes.

    Subclasses only need to:
        1. Build the recurrent layers in ``__init__`` and store the final
           hidden size as ``self._final_hidden_size``.
        2. Override ``_recurrent_forward`` to return the last time-step
           hidden state of shape ``(batch, final_hidden_size)``.

    Args:
        input_size: Number of input features per time step.
        hidden_sizes: List of hidden sizes for each recurrent layer.
            Defaults to ``[128, 64]``.
        num_layers: Kept for interface compatibility; the actual stacking
            is handled manually so that heterogeneous layers (LSTM + GRU)
            can be mixed.  Each element in *hidden_sizes* defines one layer.
        dropout: Dropout probability applied between the last recurrent
            output and the dense head.  Defaults to ``0.3``.
        task: ``'regression'`` for a linear output or ``'classification'``
            for a sigmoid-activated output.  Defaults to ``'regression'``.
    """

    def __init__(
        self,
        input_size: int,
        hidden_sizes: list[int] | None = None,
        num_layers: int = 2,
        dropout: float = 0.3,
        task: Literal["regression", "classification"] = "regression",
    ) -> None:
        super().__init__()

        if task not in ("regression", "classification"):
            raise ValueError(
                f"task must be 'regression' or 'classification', got '{task}'"
            )

        self.input_size = input_size
        self.hidden_sizes = hidden_sizes or [128, 64]
        self.num_layers = num_layers
        self.dropout_p = dropout
        self.task = task

        # Placeholder – subclasses MUST set this before calling _build_head().
        self._final_hidden_size: int = self.hidden_sizes[-1]

    # -- shared head --------------------------------------------------------

    def _build_head(self) -> None:
        """Construct the shared batch-norm → dropout → dense layers.

        Must be called by each subclass **after** setting
        ``self._final_hidden_size``.
        """
        self.batch_norm = nn.BatchNorm1d(self._final_hidden_size)
        self.dropout = nn.Dropout(p=self.dropout_p)

        # Dense projection: hidden → 32 → 1
        self.fc1 = nn.Linear(self._final_hidden_size, 32)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(32, 1)

        # Task-specific activation
        self.output_activation = nn.Sigmoid() if self.task == "classification" else nn.Identity()

        # Initialise dense layers
        _init_linear_weights(self.fc1)
        _init_linear_weights(self.fc2)

    # -- forward ------------------------------------------------------------

    def _recurrent_forward(self, x: torch.Tensor) -> torch.Tensor:
        """Run the recurrent layers and return the hidden state at the last
        time step.

        Args:
            x: Input tensor of shape ``(batch, seq_len, input_size)``.

        Returns:
            Tensor of shape ``(batch, final_hidden_size)``.
        """
        raise NotImplementedError

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Full forward pass: recurrent layers → batch norm → dropout →
        dense → output activation.

        Args:
            x: Input tensor of shape ``(batch, seq_len, num_features)``.

        Returns:
            Predictions of shape ``(batch, 1)``.
        """
        # Recurrent encoding – last time-step hidden state
        h = self._recurrent_forward(x)               # (B, H)

        # Normalise & regularise
        h = self.batch_norm(h)                        # (B, H)
        h = self.dropout(h)                           # (B, H)

        # Dense head
        h = self.relu(self.fc1(h))                    # (B, 32)
        h = self.fc2(h)                               # (B, 1)
        out = self.output_activation(h)               # (B, 1)
        return out

    # -- convenience --------------------------------------------------------

    @property
    def model_name(self) -> str:
        """Human-readable name of the model variant."""
        raise NotImplementedError

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"{self.model_name}(input_size={self.input_size}, "
            f"hidden_sizes={self.hidden_sizes}, dropout={self.dropout_p}, "
            f"task='{self.task}')"
        )


# ---------------------------------------------------------------------------
# Concrete models
# ---------------------------------------------------------------------------

class LSTMModel(_BaseRecurrentModel):
    """Two-layer stacked LSTM followed by a dense prediction head.

    Architecture::

        Input (B, T, F)
        → LSTM-1  (F → 128)
        → LSTM-2  (128 → 64)   with inter-layer dropout
        → BatchNorm1d(64)
        → Dropout(0.3)
        → Linear(64 → 32) + ReLU
        → Linear(32 → 1)
        → Identity (regression) / Sigmoid (classification)

    Args:
        input_size: Number of input features *F* per time step.
        hidden_sizes: Hidden sizes for each LSTM layer. Defaults to
            ``[128, 64]``.
        num_layers: Number of stacked LSTM layers (len of *hidden_sizes*
            takes precedence).
        dropout: Dropout probability.
        task: ``'regression'`` or ``'classification'``.
    """

    def __init__(
        self,
        input_size: int,
        hidden_sizes: list[int] | None = None,
        num_layers: int = 2,
        dropout: float = 0.3,
        task: Literal["regression", "classification"] = "regression",
    ) -> None:
        super().__init__(input_size, hidden_sizes, num_layers, dropout, task)

        # Build stacked LSTM layers manually so we can apply per-layer init
        self.lstm_layers = nn.ModuleList()
        layer_input_size = self.input_size
        for i, h_size in enumerate(self.hidden_sizes):
            lstm = nn.LSTM(
                input_size=layer_input_size,
                hidden_size=h_size,
                num_layers=1,
                batch_first=True,
                dropout=0.0,  # dropout handled between layers manually
            )
            _init_recurrent_weights(lstm)
            self.lstm_layers.append(lstm)
            layer_input_size = h_size

        # Inter-layer dropout (applied between stacked recurrent layers)
        self.inter_dropout = nn.Dropout(p=self.dropout_p)

        self._final_hidden_size = self.hidden_sizes[-1]
        self._build_head()

    # -- recurrent forward --------------------------------------------------

    def _recurrent_forward(self, x: torch.Tensor) -> torch.Tensor:
        """Pass *x* through each LSTM layer sequentially.

        Args:
            x: ``(batch, seq_len, input_size)``

        Returns:
            Last time-step hidden state ``(batch, hidden_sizes[-1])``.
        """
        out = x
        for i, lstm in enumerate(self.lstm_layers):
            out, _ = lstm(out)  # (B, T, H_i)
            # Apply dropout between layers (not after the last one)
            if i < len(self.lstm_layers) - 1:
                out = self.inter_dropout(out)
        # Take the output at the last time step
        return out[:, -1, :]  # (B, H_last)

    @property
    def model_name(self) -> str:
        return "LSTMModel"


class GRUModel(_BaseRecurrentModel):
    """Two-layer stacked GRU followed by a dense prediction head.

    Architecture mirrors :class:`LSTMModel` but substitutes GRU cells for
    LSTM cells.

    Args:
        input_size: Number of input features per time step.
        hidden_sizes: Hidden sizes for each GRU layer. Defaults to
            ``[128, 64]``.
        num_layers: Number of stacked GRU layers.
        dropout: Dropout probability.
        task: ``'regression'`` or ``'classification'``.
    """

    def __init__(
        self,
        input_size: int,
        hidden_sizes: list[int] | None = None,
        num_layers: int = 2,
        dropout: float = 0.3,
        task: Literal["regression", "classification"] = "regression",
    ) -> None:
        super().__init__(input_size, hidden_sizes, num_layers, dropout, task)

        self.gru_layers = nn.ModuleList()
        layer_input_size = self.input_size
        for i, h_size in enumerate(self.hidden_sizes):
            gru = nn.GRU(
                input_size=layer_input_size,
                hidden_size=h_size,
                num_layers=1,
                batch_first=True,
                dropout=0.0,
            )
            _init_recurrent_weights(gru)
            self.gru_layers.append(gru)
            layer_input_size = h_size

        self.inter_dropout = nn.Dropout(p=self.dropout_p)

        self._final_hidden_size = self.hidden_sizes[-1]
        self._build_head()

    # -- recurrent forward --------------------------------------------------

    def _recurrent_forward(self, x: torch.Tensor) -> torch.Tensor:
        """Pass *x* through each GRU layer sequentially.

        Args:
            x: ``(batch, seq_len, input_size)``

        Returns:
            Last time-step hidden state ``(batch, hidden_sizes[-1])``.
        """
        out = x
        for i, gru in enumerate(self.gru_layers):
            out, _ = gru(out)
            if i < len(self.gru_layers) - 1:
                out = self.inter_dropout(out)
        return out[:, -1, :]

    @property
    def model_name(self) -> str:
        return "GRUModel"


class HybridModel(_BaseRecurrentModel):
    """Hybrid LSTM → GRU model with a dense prediction head.

    The first recurrent layer is an LSTM (captures long-range dependencies
    via the cell state), while the second layer is a GRU (lighter and often
    faster to converge).  This combination can offer a favourable trade-off
    between capacity and training efficiency.

    Architecture::

        Input (B, T, F)
        → LSTM  (F → 128)
        → Dropout(0.3)
        → GRU   (128 → 64)
        → BatchNorm1d(64)
        → Dropout(0.3)
        → Linear(64 → 32) + ReLU
        → Linear(32 → 1)
        → Identity / Sigmoid

    Args:
        input_size: Number of input features per time step.
        hidden_sizes: ``[lstm_hidden, gru_hidden]``. Defaults to
            ``[128, 64]``.
        num_layers: Ignored (always 1 LSTM + 1 GRU).
        dropout: Dropout probability.
        task: ``'regression'`` or ``'classification'``.
    """

    def __init__(
        self,
        input_size: int,
        hidden_sizes: list[int] | None = None,
        num_layers: int = 2,
        dropout: float = 0.3,
        task: Literal["regression", "classification"] = "regression",
    ) -> None:
        super().__init__(input_size, hidden_sizes, num_layers, dropout, task)

        if len(self.hidden_sizes) < 2:
            raise ValueError(
                "HybridModel requires at least two hidden sizes "
                "[lstm_hidden, gru_hidden]."
            )

        lstm_hidden = self.hidden_sizes[0]
        gru_hidden = self.hidden_sizes[1]

        # Layer 1 – LSTM
        self.lstm = nn.LSTM(
            input_size=self.input_size,
            hidden_size=lstm_hidden,
            num_layers=1,
            batch_first=True,
        )
        _init_recurrent_weights(self.lstm)

        # Inter-layer dropout
        self.inter_dropout = nn.Dropout(p=self.dropout_p)

        # Layer 2 – GRU
        self.gru = nn.GRU(
            input_size=lstm_hidden,
            hidden_size=gru_hidden,
            num_layers=1,
            batch_first=True,
        )
        _init_recurrent_weights(self.gru)

        self._final_hidden_size = gru_hidden
        self._build_head()

    # -- recurrent forward --------------------------------------------------

    def _recurrent_forward(self, x: torch.Tensor) -> torch.Tensor:
        """Pass *x* through the LSTM then the GRU.

        Args:
            x: ``(batch, seq_len, input_size)``

        Returns:
            Last time-step hidden state ``(batch, hidden_sizes[1])``.
        """
        out, _ = self.lstm(x)          # (B, T, lstm_hidden)
        out = self.inter_dropout(out)  # (B, T, lstm_hidden)
        out, _ = self.gru(out)         # (B, T, gru_hidden)
        return out[:, -1, :]           # (B, gru_hidden)

    @property
    def model_name(self) -> str:
        return "HybridModel"


# ---------------------------------------------------------------------------
# Quick smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Synthetic batch: 16 samples, 30 time steps, 10 features
    batch_size, seq_len, num_features = 16, 30, 10
    dummy_input = torch.randn(batch_size, seq_len, num_features)

    for ModelClass in (LSTMModel, GRUModel, HybridModel):
        for task in ("regression", "classification"):
            model = ModelClass(input_size=num_features, task=task)
            output = model(dummy_input)
            assert output.shape == (batch_size, 1), (
                f"{model.model_name} ({task}): expected shape "
                f"({batch_size}, 1), got {output.shape}"
            )
            # Classification outputs must be in [0, 1]
            if task == "classification":
                assert output.min() >= 0.0 and output.max() <= 1.0, (
                    f"{model.model_name}: classification outputs out of [0,1]"
                )
            total_params = sum(p.numel() for p in model.parameters())
            print(
                f"✓ {model.model_name:12s} | task={task:15s} | "
                f"output={tuple(output.shape)} | params={total_params:,}"
            )

    print("\nAll smoke tests passed.")
