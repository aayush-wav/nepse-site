"""
evaluate.py - Comprehensive Evaluation and Visualization for NEPSE Prediction
==============================================================================

Provides functions for computing regression/classification metrics,
generating professional plots, and producing summary reports.

Usage:
    from evaluate import evaluate_regression, plot_predictions, generate_report
"""

import os
import csv
from datetime import datetime
from typing import Dict, List, Optional, Union

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import numpy as np
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)

# ---------------------------------------------------------------------------
# Global style
# ---------------------------------------------------------------------------
try:
    plt.style.use('seaborn-v0_8-darkgrid')
except OSError:
    # Fallback for older matplotlib versions
    try:
        plt.style.use('seaborn-darkgrid')
    except OSError:
        plt.style.use('ggplot')

DEFAULT_OUTPUT_DIR = 'd:/nepse ag/results'


def _ensure_dir(path: str) -> None:
    """Create directory (and parents) if it does not exist."""
    directory = os.path.dirname(path) if not os.path.isdir(path) else path
    os.makedirs(directory, exist_ok=True)


# =====================================================================
# 1. Regression Evaluation
# =====================================================================

def evaluate_regression(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    scaler=None,
    label: str = "Regression",
) -> Dict[str, float]:
    """Evaluate regression predictions and print a formatted summary.

    Parameters
    ----------
    y_true : np.ndarray
        Ground-truth values (1-D or 2-D with single column).
    y_pred : np.ndarray
        Predicted values (same shape as *y_true*).
    scaler : sklearn-compatible scaler, optional
        If provided, ``inverse_transform`` is applied to both arrays
        before computing metrics (useful when data was normalised).
    label : str
        A descriptive label printed in the header.

    Returns
    -------
    dict
        Dictionary with keys: ``rmse``, ``mae``, ``mape``, ``r2``,
        ``directional_accuracy``.
    """
    y_true = np.asarray(y_true).flatten()
    y_pred = np.asarray(y_pred).flatten()

    # Inverse-transform if a scaler is supplied
    if scaler is not None:
        y_true = scaler.inverse_transform(y_true.reshape(-1, 1)).flatten()
        y_pred = scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()

    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))

    # MAPE – guard against zeros in y_true
    nonzero_mask = y_true != 0
    if nonzero_mask.any():
        mape = float(
            np.mean(np.abs((y_true[nonzero_mask] - y_pred[nonzero_mask]) / y_true[nonzero_mask])) * 100
        )
    else:
        mape = float('inf')

    r2 = float(r2_score(y_true, y_pred))

    # Directional accuracy: fraction of time-steps where the direction of
    # change (up / down) matches between actual and predicted.
    if len(y_true) > 1:
        actual_dir = np.sign(np.diff(y_true))
        pred_dir = np.sign(np.diff(y_pred))
        directional_accuracy = float(np.mean(actual_dir == pred_dir) * 100)
    else:
        directional_accuracy = 0.0

    metrics: Dict[str, float] = {
        'rmse': rmse,
        'mae': mae,
        'mape': mape,
        'r2': r2,
        'directional_accuracy': directional_accuracy,
    }

    # Pretty-print
    print(f"\n{'=' * 55}")
    print(f"  {label} Metrics")
    print(f"{'=' * 55}")
    print(f"  RMSE                 : {rmse:>12.4f}")
    print(f"  MAE                  : {mae:>12.4f}")
    print(f"  MAPE                 : {mape:>11.2f} %")
    print(f"  R2                   : {r2:>12.4f}")
    print(f"  Directional Accuracy : {directional_accuracy:>11.2f} %")
    print(f"{'=' * 55}\n")

    return metrics


# =====================================================================
# 2. Classification Evaluation
# =====================================================================

def evaluate_classification(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    threshold: float = 0.5,
    label: str = "Classification",
) -> Dict[str, float]:
    """Evaluate binary classification predictions and print a summary.

    Parameters
    ----------
    y_true : np.ndarray
        Ground-truth binary labels (0 / 1).
    y_pred_proba : np.ndarray
        Predicted probabilities for the positive class.
    threshold : float
        Decision threshold for converting probabilities to labels.
    label : str
        Descriptive label for the printed header.

    Returns
    -------
    dict
        Dictionary with keys: ``accuracy``, ``precision``, ``recall``,
        ``f1``, ``auc_roc``.
    """
    y_true = np.asarray(y_true).flatten().astype(int)
    y_pred_proba = np.asarray(y_pred_proba).flatten()
    y_pred_labels = (y_pred_proba >= threshold).astype(int)

    acc = float(accuracy_score(y_true, y_pred_labels))
    prec = float(precision_score(y_true, y_pred_labels, zero_division=0))
    rec = float(recall_score(y_true, y_pred_labels, zero_division=0))
    f1 = float(f1_score(y_true, y_pred_labels, zero_division=0))

    # AUC-ROC requires at least two classes present
    try:
        auc = float(roc_auc_score(y_true, y_pred_proba))
    except ValueError:
        auc = float('nan')

    cm = confusion_matrix(y_true, y_pred_labels)

    metrics: Dict[str, float] = {
        'accuracy': acc,
        'precision': prec,
        'recall': rec,
        'f1': f1,
        'auc_roc': auc,
    }

    # Pretty-print
    print(f"\n{'=' * 55}")
    print(f"  {label} Metrics")
    print(f"{'=' * 55}")
    print(f"  Accuracy  : {acc:>8.4f}  ({acc * 100:.2f} %)")
    print(f"  Precision : {prec:>8.4f}")
    print(f"  Recall    : {rec:>8.4f}")
    print(f"  F1 Score  : {f1:>8.4f}")
    print(f"  AUC-ROC   : {auc:>8.4f}")
    print(f"\n  Confusion Matrix:")
    print(f"  {'-' * 30}")
    print(f"  {'':>15} Pred 0   Pred 1")
    for i, row in enumerate(cm):
        print(f"  Actual {i}  {' '.join(f'{v:>8d}' for v in row)}")
    print(f"{'=' * 55}\n")

    return metrics


# =====================================================================
# 3. Plot: Predicted vs Actual Prices
# =====================================================================

def plot_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    dates: Optional[np.ndarray] = None,
    title: str = "NEPSE Index – Predicted vs Actual",
    save_path: Optional[str] = None,
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> str:
    """Create a professional predicted-vs-actual price plot.

    Parameters
    ----------
    y_true, y_pred : np.ndarray
        Actual and predicted values.
    dates : np.ndarray, optional
        Date/time labels for the x-axis.
    title : str
        Plot title.
    save_path : str, optional
        Full path to save the figure. If *None*, a default path inside
        *output_dir* is used.
    output_dir : str
        Fallback directory when *save_path* is not given.

    Returns
    -------
    str
        The path where the figure was saved.
    """
    y_true = np.asarray(y_true).flatten()
    y_pred = np.asarray(y_pred).flatten()

    if save_path is None:
        save_path = os.path.join(output_dir, 'predictions_vs_actual.png')
    _ensure_dir(save_path)

    # Compute annotation metrics
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(14, 6))

    x_axis = dates if dates is not None else np.arange(len(y_true))

    ax.plot(x_axis, y_true, label='Actual', color='#1f77b4', linewidth=1.8, alpha=0.9)
    ax.plot(x_axis, y_pred, label='Predicted', color='#ff7f0e', linewidth=1.5, alpha=0.85, linestyle='--')

    # Shade the error region
    ax.fill_between(
        x_axis, y_true, y_pred,
        alpha=0.12, color='#ff7f0e', label='Prediction Error',
    )

    ax.set_title(title, fontsize=15, fontweight='bold', pad=12)
    ax.set_xlabel('Date' if dates is not None else 'Time Step', fontsize=12)
    ax.set_ylabel('NEPSE Index', fontsize=12)
    ax.legend(loc='upper left', fontsize=10, framealpha=0.9)

    # Metrics annotation box
    textstr = f"RMSE = {rmse:.2f}\nMAE  = {mae:.2f}\nR²   = {r2:.4f}"
    props = dict(boxstyle='round,pad=0.5', facecolor='white', alpha=0.85, edgecolor='gray')
    ax.text(
        0.98, 0.97, textstr, transform=ax.transAxes,
        fontsize=10, verticalalignment='top', horizontalalignment='right',
        bbox=props, family='monospace',
    )

    # Rotate date labels if dates are provided
    if dates is not None:
        fig.autofmt_xdate(rotation=30)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[OK] Prediction plot saved -> {save_path}")
    return save_path


# =====================================================================
# 4. Plot: Training History (loss + learning rate)
# =====================================================================

def plot_training_history(
    history: Dict[str, List[float]],
    save_path: Optional[str] = None,
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> str:
    """Plot training / validation loss and (optionally) learning rate.

    Parameters
    ----------
    history : dict
        Must contain ``'train_loss'`` and ``'val_loss'`` (lists of floats).
        Optionally contains ``'lr'`` (learning rate per epoch).
    save_path : str, optional
        Full path for the saved figure.
    output_dir : str
        Fallback directory.

    Returns
    -------
    str
        Path where the figure was saved.
    """
    if save_path is None:
        save_path = os.path.join(output_dir, 'training_history.png')
    _ensure_dir(save_path)

    epochs = np.arange(1, len(history['train_loss']) + 1)

    fig, ax1 = plt.subplots(figsize=(12, 5))

    # ---- Left y-axis: losses ----
    color_train = '#1f77b4'
    color_val = '#d62728'

    ax1.plot(epochs, history['train_loss'], label='Train Loss', color=color_train,
             linewidth=1.6, marker='o', markersize=3)
    ax1.plot(epochs, history['val_loss'], label='Val Loss', color=color_val,
             linewidth=1.6, marker='s', markersize=3)

    ax1.set_xlabel('Epoch', fontsize=12)
    ax1.set_ylabel('Loss', fontsize=12, color='black')
    ax1.tick_params(axis='y')
    ax1.set_xlim(epochs[0], epochs[-1])

    # Mark best validation loss
    best_idx = int(np.argmin(history['val_loss']))
    ax1.axvline(x=epochs[best_idx], color='gray', linestyle=':', alpha=0.6)
    ax1.annotate(
        f"Best val loss\nepoch {epochs[best_idx]}",
        xy=(epochs[best_idx], history['val_loss'][best_idx]),
        xytext=(epochs[best_idx] + max(1, len(epochs) * 0.05),
                history['val_loss'][best_idx]),
        fontsize=9, arrowprops=dict(arrowstyle='->', color='gray'),
        bbox=dict(boxstyle='round,pad=0.3', fc='lightyellow', alpha=0.8),
    )

    # ---- Right y-axis: learning rate (optional) ----
    if 'lr' in history and len(history['lr']) == len(epochs):
        ax2 = ax1.twinx()
        color_lr = '#2ca02c'
        ax2.plot(epochs, history['lr'], label='Learning Rate', color=color_lr,
                 linewidth=1.2, linestyle='-.', alpha=0.7)
        ax2.set_ylabel('Learning Rate', fontsize=12, color=color_lr)
        ax2.tick_params(axis='y', labelcolor=color_lr)
        ax2.yaxis.set_major_formatter(mticker.FormatStrFormatter('%.1e'))

        # Merge legends from both axes
        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper right',
                   fontsize=10, framealpha=0.9)
    else:
        ax1.legend(loc='upper right', fontsize=10, framealpha=0.9)

    ax1.set_title('Training History', fontsize=14, fontweight='bold', pad=10)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[OK] Training history plot saved -> {save_path}")
    return save_path


# =====================================================================
# 5. Plot: Confusion Matrix Heatmap
# =====================================================================

def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: Optional[List[str]] = None,
    title: str = "Confusion Matrix",
    save_path: Optional[str] = None,
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> str:
    """Create an annotated heatmap confusion matrix.

    Parameters
    ----------
    y_true : np.ndarray
        Ground-truth labels.
    y_pred : np.ndarray
        Predicted labels (hard decisions, not probabilities).
    class_names : list of str, optional
        Tick labels for each class. Defaults to ``['Down', 'Up']``.
    title : str
        Plot title.
    save_path : str, optional
        Full save path. Falls back to *output_dir*.
    output_dir : str
        Fallback directory.

    Returns
    -------
    str
        Path where the figure was saved.
    """
    if save_path is None:
        save_path = os.path.join(output_dir, 'confusion_matrix.png')
    _ensure_dir(save_path)

    if class_names is None:
        class_names = ['Down', 'Up']

    y_true = np.asarray(y_true).flatten().astype(int)
    y_pred = np.asarray(y_pred).flatten().astype(int)

    cm = confusion_matrix(y_true, y_pred)
    cm_pct = cm.astype(float) / cm.sum() * 100

    fig, ax = plt.subplots(figsize=(7, 6))

    # Build annotation strings: count + percentage
    annot = np.empty_like(cm, dtype=object)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            annot[i, j] = f"{cm[i, j]}\n({cm_pct[i, j]:.1f}%)"

    sns.heatmap(
        cm, annot=annot, fmt='', cmap='Blues',
        xticklabels=class_names, yticklabels=class_names,
        linewidths=0.8, linecolor='white',
        cbar_kws={'label': 'Count'},
        ax=ax,
    )

    ax.set_xlabel('Predicted Label', fontsize=12)
    ax.set_ylabel('True Label', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold', pad=10)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[OK] Confusion matrix saved -> {save_path}")
    return save_path


# =====================================================================
# 6. Plot: Residual Analysis
# =====================================================================

def plot_residuals(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str = "Residual Analysis",
    save_path: Optional[str] = None,
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> str:
    """Create residual distribution histogram and residual-vs-predicted scatter.

    Parameters
    ----------
    y_true, y_pred : np.ndarray
        Actual and predicted values.
    title : str
        Suptitle for the figure.
    save_path : str, optional
        Full save path.
    output_dir : str
        Fallback directory.

    Returns
    -------
    str
        Path where the figure was saved.
    """
    if save_path is None:
        save_path = os.path.join(output_dir, 'residuals.png')
    _ensure_dir(save_path)

    y_true = np.asarray(y_true).flatten()
    y_pred = np.asarray(y_pred).flatten()
    residuals = y_true - y_pred

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # --- Left: Residual distribution ---
    ax0 = axes[0]
    sns.histplot(residuals, kde=True, color='#4c72b0', edgecolor='white',
                 linewidth=0.5, ax=ax0, bins='auto')
    ax0.axvline(x=0, color='red', linestyle='--', linewidth=1.2, alpha=0.7)
    ax0.set_xlabel('Residual (Actual − Predicted)', fontsize=11)
    ax0.set_ylabel('Frequency', fontsize=11)
    ax0.set_title('Residual Distribution', fontsize=13, fontweight='bold')

    # Stats annotation
    stats_str = (
        f"Mean  = {np.mean(residuals):+.2f}\n"
        f"Std   = {np.std(residuals):.2f}\n"
        f"Skew  = {_safe_skew(residuals):+.3f}"
    )
    ax0.text(
        0.97, 0.95, stats_str, transform=ax0.transAxes,
        fontsize=9, verticalalignment='top', horizontalalignment='right',
        bbox=dict(boxstyle='round,pad=0.4', facecolor='white', alpha=0.85),
        family='monospace',
    )

    # --- Right: Residuals vs Predicted ---
    ax1 = axes[1]
    ax1.scatter(y_pred, residuals, alpha=0.45, s=18, color='#4c72b0', edgecolors='none')
    ax1.axhline(y=0, color='red', linestyle='--', linewidth=1.2, alpha=0.7)

    # Lowess-like trend: simple moving average for visual guidance
    if len(y_pred) > 20:
        sorted_idx = np.argsort(y_pred)
        window = max(len(y_pred) // 20, 5)
        smoothed = np.convolve(
            residuals[sorted_idx],
            np.ones(window) / window,
            mode='valid',
        )
        ax1.plot(
            y_pred[sorted_idx][window // 2: window // 2 + len(smoothed)],
            smoothed, color='orange', linewidth=2, label='Moving Avg',
        )
        ax1.legend(fontsize=9)

    ax1.set_xlabel('Predicted Value', fontsize=11)
    ax1.set_ylabel('Residual', fontsize=11)
    ax1.set_title('Residuals vs Predicted', fontsize=13, fontweight='bold')

    fig.suptitle(title, fontsize=15, fontweight='bold', y=1.02)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches='tight')
    plt.close(fig)
    print(f"[OK] Residual plot saved -> {save_path}")
    return save_path


def _safe_skew(arr: np.ndarray) -> float:
    """Compute skewness without requiring scipy."""
    n = len(arr)
    if n < 3:
        return 0.0
    mean = np.mean(arr)
    std = np.std(arr, ddof=1)
    if std == 0:
        return 0.0
    return float((n / ((n - 1) * (n - 2))) * np.sum(((arr - mean) / std) ** 3))


# =====================================================================
# 7. Report Generation
# =====================================================================

def generate_report(
    regression_metrics: Optional[Dict[str, float]] = None,
    classification_metrics: Optional[Dict[str, float]] = None,
    model_name: str = "NEPSE Predictor",
    csv_path: Optional[str] = None,
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> str:
    """Print a comprehensive summary report and save metrics to CSV.

    Parameters
    ----------
    regression_metrics : dict, optional
        Output of :func:`evaluate_regression`.
    classification_metrics : dict, optional
        Output of :func:`evaluate_classification`.
    model_name : str
        Model name used in the report header.
    csv_path : str, optional
        Full path for the CSV file. Falls back to *output_dir*.
    output_dir : str
        Fallback directory.

    Returns
    -------
    str
        Path where the CSV was saved.
    """
    if csv_path is None:
        csv_path = os.path.join(output_dir, 'evaluation_metrics.csv')
    _ensure_dir(csv_path)

    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # ---- Console report ----
    width = 60
    print(f"\n{'#' * width}")
    print(f"#{'':^{width - 2}}#")
    print(f"#{'EVALUATION REPORT':^{width - 2}}#")
    print(f"#{'':^{width - 2}}#")
    print(f"{'#' * width}")
    print(f"  Model     : {model_name}")
    print(f"  Timestamp : {timestamp}")
    print(f"{'-' * width}")

    if regression_metrics:
        print(f"\n  +{'-' * 44}+")
        print(f"  |{'REGRESSION TASK':^44}|")
        print(f"  +{'-' * 44}+")
        print(f"  |  RMSE                 : {regression_metrics['rmse']:>12.4f}    |")
        print(f"  |  MAE                  : {regression_metrics['mae']:>12.4f}    |")
        print(f"  |  MAPE                 : {regression_metrics['mape']:>11.2f} %   |")
        print(f"  |  R2                   : {regression_metrics['r2']:>12.4f}    |")
        print(f"  |  Directional Accuracy : {regression_metrics['directional_accuracy']:>11.2f} %   |")
        print(f"  +{'-' * 44}+")

    if classification_metrics:
        print(f"\n  +{'-' * 44}+")
        print(f"  |{'CLASSIFICATION TASK':^44}|")
        print(f"  +{'-' * 44}+")
        print(f"  |  Accuracy  : {classification_metrics['accuracy']:>8.4f}               |")
        print(f"  |  Precision : {classification_metrics['precision']:>8.4f}               |")
        print(f"  |  Recall    : {classification_metrics['recall']:>8.4f}               |")
        print(f"  |  F1 Score  : {classification_metrics['f1']:>8.4f}               |")
        print(f"  |  AUC-ROC   : {classification_metrics['auc_roc']:>8.4f}               |")
        print(f"  +{'-' * 44}+")

    if not regression_metrics and not classification_metrics:
        print("  (No metrics provided)")

    print(f"\n{'#' * width}\n")

    # ---- Save to CSV ----
    rows = []
    if regression_metrics:
        for key, val in regression_metrics.items():
            rows.append({
                'timestamp': timestamp,
                'model': model_name,
                'task': 'regression',
                'metric': key,
                'value': f"{val:.6f}",
            })
    if classification_metrics:
        for key, val in classification_metrics.items():
            rows.append({
                'timestamp': timestamp,
                'model': model_name,
                'task': 'classification',
                'metric': key,
                'value': f"{val:.6f}",
            })

    if rows:
        file_exists = os.path.isfile(csv_path)
        with open(csv_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['timestamp', 'model', 'task', 'metric', 'value'])
            if not file_exists:
                writer.writeheader()
            writer.writerows(rows)
        print(f"[OK] Metrics appended to CSV -> {csv_path}")
    else:
        print("[!] No metrics to save.")

    return csv_path


# =====================================================================
# Convenience: run all evaluations at once
# =====================================================================

def run_full_evaluation(
    y_true_reg: np.ndarray,
    y_pred_reg: np.ndarray,
    y_true_cls: Optional[np.ndarray] = None,
    y_pred_proba_cls: Optional[np.ndarray] = None,
    dates: Optional[np.ndarray] = None,
    scaler=None,
    history: Optional[Dict[str, List[float]]] = None,
    model_name: str = "NEPSE Predictor",
    output_dir: str = DEFAULT_OUTPUT_DIR,
) -> Dict[str, Union[Dict[str, float], str]]:
    """Run all evaluation steps and generate every plot + report.

    This is a convenience wrapper that calls every individual function
    and returns all results in a single dictionary.

    Parameters
    ----------
    y_true_reg, y_pred_reg : np.ndarray
        Regression ground truth and predictions.
    y_true_cls : np.ndarray, optional
        Classification ground truth labels.
    y_pred_proba_cls : np.ndarray, optional
        Classification predicted probabilities.
    dates : np.ndarray, optional
        Date labels for prediction plot x-axis.
    scaler : optional
        Scaler for inverse-transforming regression values.
    history : dict, optional
        Training history (keys: ``train_loss``, ``val_loss``, ``lr``).
    model_name : str
        Model name for the report.
    output_dir : str
        Directory where all outputs are saved.

    Returns
    -------
    dict
        Keys: ``regression_metrics``, ``classification_metrics``,
        ``prediction_plot``, ``residual_plot``, ``history_plot``,
        ``confusion_matrix_plot``, ``report_csv``.
    """
    _ensure_dir(output_dir)
    results: Dict[str, Union[Dict[str, float], str, None]] = {}

    # Regression
    reg_metrics = evaluate_regression(
        y_true_reg, y_pred_reg, scaler=scaler, label=f"{model_name} – Regression",
    )
    results['regression_metrics'] = reg_metrics

    # Regression plots
    results['prediction_plot'] = plot_predictions(
        y_true_reg, y_pred_reg, dates=dates,
        title=f"{model_name} – Predicted vs Actual",
        output_dir=output_dir,
    )
    results['residual_plot'] = plot_residuals(
        y_true_reg, y_pred_reg,
        title=f"{model_name} – Residual Analysis",
        output_dir=output_dir,
    )

    # Training history
    if history is not None:
        results['history_plot'] = plot_training_history(
            history, output_dir=output_dir,
        )
    else:
        results['history_plot'] = None

    # Classification
    cls_metrics = None
    if y_true_cls is not None and y_pred_proba_cls is not None:
        cls_metrics = evaluate_classification(
            y_true_cls, y_pred_proba_cls,
            label=f"{model_name} – Classification",
        )
        results['classification_metrics'] = cls_metrics

        y_pred_labels = (np.asarray(y_pred_proba_cls).flatten() >= 0.5).astype(int)
        results['confusion_matrix_plot'] = plot_confusion_matrix(
            y_true_cls, y_pred_labels,
            title=f"{model_name} – Confusion Matrix",
            output_dir=output_dir,
        )
    else:
        results['classification_metrics'] = None
        results['confusion_matrix_plot'] = None

    # Report
    results['report_csv'] = generate_report(
        regression_metrics=reg_metrics,
        classification_metrics=cls_metrics,
        model_name=model_name,
        output_dir=output_dir,
    )

    return results


# =====================================================================
# Main guard – quick smoke test
# =====================================================================

if __name__ == '__main__':
    print("Running smoke test for evaluate.py …\n")
    np.random.seed(42)

    # Synthetic regression data
    n = 200
    x = np.linspace(2000, 2800, n)
    y_true_r = x + np.random.normal(0, 30, n)
    y_pred_r = x + np.random.normal(0, 50, n)

    reg_m = evaluate_regression(y_true_r, y_pred_r, label="Smoke Test Regression")

    # Synthetic classification data
    y_true_c = np.random.randint(0, 2, n)
    y_pred_p = np.clip(y_true_c + np.random.normal(0, 0.3, n), 0, 1)

    cls_m = evaluate_classification(y_true_c, y_pred_p, label="Smoke Test Classification")

    # Plots
    plot_predictions(y_true_r, y_pred_r, title="Smoke Test – Predictions")
    plot_residuals(y_true_r, y_pred_r, title="Smoke Test – Residuals")

    y_pred_labels = (y_pred_p >= 0.5).astype(int)
    plot_confusion_matrix(y_true_c, y_pred_labels, title="Smoke Test – CM")

    # Training history
    epochs = 50
    train_loss = np.exp(-np.linspace(0, 3, epochs)) + np.random.normal(0, 0.01, epochs)
    val_loss = np.exp(-np.linspace(0, 2.5, epochs)) + np.random.normal(0, 0.02, epochs)
    lr = np.logspace(-2, -4, epochs)
    plot_training_history({'train_loss': list(train_loss), 'val_loss': list(val_loss), 'lr': list(lr)})

    # Report
    generate_report(regression_metrics=reg_m, classification_metrics=cls_m, model_name="Smoke Test Model")

    print("\n✅ Smoke test completed successfully.")
