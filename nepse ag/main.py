"""
main.py - End-to-End Pipeline for NEPSE Stock Prediction using News Sentiment
============================================================================

Ties together preprocessing, modeling, training, and evaluation for:
- LSTM Model
- GRUModel
- HybridModel

For both:
- Regression (predicting NEPSE closing price)
- Classification (predicting up/down price direction)
"""

import os
import torch
import numpy as np
import pandas as pd
from typing import Dict, Any, List

from data_preprocessing import preprocess_pipeline
from models import LSTMModel, GRUModel, HybridModel
from train import create_data_loaders, train_model
from evaluate import run_full_evaluation


def run_pipeline():
    # Setup paths
    workspace_dir = r"d:\nepse ag"
    sentiment_path = os.path.join(workspace_dir, "daily_sentiment_weighted.csv")
    nepse_path = os.path.join(workspace_dir, "NEPSE INDEX APR 2004 TO APR 2024.xlsx")
    results_dir = os.path.join(workspace_dir, "results")
    os.makedirs(results_dir, exist_ok=True)

    print("=" * 80)
    print("NEPSE SENTIMENT ML PREDICTION PIPELINE")
    print("=" * 80)
    print(f"Sentiment data path: {sentiment_path}")
    print(f"NEPSE data path:     {nepse_path}")
    print(f"Results output dir:  {results_dir}")
    print("=" * 80)

    # 1. Preprocess data (Sequence length = 15)
    seq_length = 15
    data = preprocess_pipeline(
        sentiment_path, nepse_path, seq_length=seq_length, train_ratio=0.7, val_ratio=0.15
    )

    # Dictionary to store final comparative results
    comparison_results = []

    # Device configuration
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"\nUsing device: {device}\n")

    # Hyperparameters config
    config = {
        "lr": 0.001,
        "epochs": 150,
        "weight_decay": 1e-5,
        "device": device,
        "batch_size": 32,
    }

    # Iterate through each model class
    model_classes = [
        ("LSTM", LSTMModel),
        ("GRU", GRUModel),
        ("Hybrid", HybridModel),
    ]

    for model_name, ModelClass in model_classes:
        print("\n" + "=" * 80)
        print(f"TRAINING AND EVALUATING MODEL: {model_name}")
        print("=" * 80)

        # ----------------------------------------------------
        # TASK 1: REGRESSION (Predicting NEPSE Index)
        # ----------------------------------------------------
        print(f"\n--- [Regression Task] {model_name} ---")
        reg_data = data["regression"]
        
        # Create DataLoaders
        train_loader_reg, val_loader_reg = create_data_loaders(
            reg_data["X_train"], reg_data["y_train"],
            reg_data["X_val"], reg_data["y_val"],
            batch_size=config["batch_size"]
        )
        
        # Instantiate Model
        model_reg = ModelClass(
            input_size=reg_data["num_features"],
            hidden_sizes=[128, 64],
            task="regression"
        )
        
        # Train Model
        reg_config = config.copy()
        reg_config["task"] = "regression"
        
        print(f"Training regression {model_name}...")
        best_state_reg, history_reg = train_model(
            model_reg, train_loader_reg, val_loader_reg, reg_config
        )
        
        # Load best weights for evaluation
        model_reg.load_state_dict(best_state_reg)
        model_reg.eval()
        
        # Predict on test set
        X_test_reg_t = torch.tensor(reg_data["X_test"], dtype=torch.float32).to(device)
        with torch.no_grad():
            preds_reg = model_reg(X_test_reg_t).cpu().numpy().flatten()
        
        # Inverse transform regression predictions & targets to actual price scale
        y_true_reg_actual = reg_data["target_scaler"].inverse_transform(
            reg_data["y_test"].reshape(-1, 1)
        ).flatten()
        y_pred_reg_actual = reg_data["target_scaler"].inverse_transform(
            preds_reg.reshape(-1, 1)
        ).flatten()
        
        # Format history dictionary with 'lr' key for plotting
        history_plot_reg = {
            "train_loss": history_reg["train_loss"],
            "val_loss": history_reg["val_loss"],
            "lr": history_reg["learning_rates"]
        }

        # ----------------------------------------------------
        # TASK 2: CLASSIFICATION (Predicting Up/Down Direction)
        # ----------------------------------------------------
        print(f"\n--- [Classification Task] {model_name} ---")
        cls_data = data["classification"]
        
        # Create DataLoaders
        train_loader_cls, val_loader_cls = create_data_loaders(
            cls_data["X_train"], cls_data["y_train"],
            cls_data["X_val"], cls_data["y_val"],
            batch_size=config["batch_size"]
        )
        
        # Instantiate Model
        model_cls = ModelClass(
            input_size=cls_data["num_features"],
            hidden_sizes=[128, 64],
            task="classification"
        )
        
        # Train Model
        cls_config = config.copy()
        cls_config["task"] = "classification"
        
        print(f"Training classification {model_name}...")
        best_state_cls, history_cls = train_model(
            model_cls, train_loader_cls, val_loader_cls, cls_config
        )
        
        # Load best weights for evaluation
        model_cls.load_state_dict(best_state_cls)
        model_cls.eval()
        
        # Predict probabilities on test set
        X_test_cls_t = torch.tensor(cls_data["X_test"], dtype=torch.float32).to(device)
        with torch.no_grad():
            preds_cls_proba = model_cls(X_test_cls_t).cpu().numpy().flatten()

        # ----------------------------------------------------
        # EVALUATION & REPORTING
        # ----------------------------------------------------
        print(f"\n--- Running Evaluation for {model_name} ---")
        model_output_dir = os.path.join(results_dir, model_name.lower())
        os.makedirs(model_output_dir, exist_ok=True)
        
        # Convert pandas date range to numpy strings or datetimes for plotting
        dates_test = reg_data["dates_test"]
        
        # Run all evaluations and save plots/reports
        eval_results = run_full_evaluation(
            y_true_reg=y_true_reg_actual,
            y_pred_reg=y_pred_reg_actual,
            y_true_cls=cls_data["y_test"],
            y_pred_proba_cls=preds_cls_proba,
            dates=dates_test,
            scaler=None, # Already inverse scaled manually above
            history=history_plot_reg,
            model_name=model_name,
            output_dir=model_output_dir
        )
        
        # Store metrics for final comparison table
        reg_metrics = eval_results["regression_metrics"]
        cls_metrics = eval_results["classification_metrics"]
        
        comparison_results.append({
            "Model": model_name,
            "Reg_RMSE": reg_metrics["rmse"],
            "Reg_MAE": reg_metrics["mae"],
            "Reg_MAPE(%)": reg_metrics["mape"],
            "Reg_R2": reg_metrics["r2"],
            "Reg_DirAccuracy(%)": reg_metrics["directional_accuracy"],
            "Cls_Accuracy(%)": cls_metrics["accuracy"] * 100,
            "Cls_Precision": cls_metrics["precision"],
            "Cls_Recall": cls_metrics["recall"],
            "Cls_F1": cls_metrics["f1"],
            "Cls_AUC": cls_metrics["auc_roc"]
        })
        
        # Save PyTorch model checkpoints
        torch.save(best_state_reg, os.path.join(model_output_dir, f"{model_name.lower()}_regression.pth"))
        torch.save(best_state_cls, os.path.join(model_output_dir, f"{model_name.lower()}_classification.pth"))
        print(f"Saved PyTorch weights to {model_output_dir}")

    # 3. Print Final Comparison Table
    df_compare = pd.DataFrame(comparison_results)
    
    print("\n" + "=" * 100)
    print("FINAL MODEL COMPARISON SUMMARY")
    print("=" * 100)
    print(df_compare.to_string(index=False))
    print("=" * 100)
    
    # Save comparison report to CSV
    compare_csv_path = os.path.join(results_dir, "model_comparison_summary.csv")
    df_compare.to_csv(compare_csv_path, index=False)
    print(f"Saved final comparative summary to: {compare_csv_path}")
    print("\nPipeline execution complete! Check the results/ directory for saved plots and weights.")


if __name__ == "__main__":
    run_pipeline()
