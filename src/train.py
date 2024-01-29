import argparse
import os
import pandas as pd
import joblib
from sklearn.multioutput import MultiOutputRegressor
from sklearn.linear_model import Ridge

if __name__ == '__main__':
    # Passing in environment variables and hyperparameters for our training script
    parser = argparse.ArgumentParser()

    # Sagemaker specific arguments. Defaults are set in the environment variables.
    parser.add_argument('--sm_model_dir', type=str, default=os.environ['SM_MODEL_DIR'])
    parser.add_argument('--train', type=str, default=os.environ['SM_CHANNEL_TRAINING'])
    parser.add_argument("--output-data-dir", type=str, default=os.environ["SM_OUTPUT_DATA_DIR"])
    parser.add_argument('--alpha', type=int, default=10)

    args = parser.parse_args()
    # args, _ = parser.parse_known_args()

    alpha = args.alpha
    model_dir = args.sm_model_dir
    train_dataset_dir = args.train

    # Load train datasets
    train_data = pd.read_csv(os.path.join(train_dataset_dir, 'train.csv'))

    # labels are in the last 14 column
    X_train = train_data.iloc[:, :-14]
    y_train = train_data.iloc[:, -14:]

    # Fit the model
    regressor = MultiOutputRegressor(Ridge(alpha=alpha, random_state=42))
    regressor.fit(X_train, y_train)

    # Save the model
    joblib.dump(regressor, os.path.join(args.sm_model_dir, "model.joblib"))
