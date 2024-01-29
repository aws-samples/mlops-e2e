import argparse
import os
import pandas as pd
import joblib
from sklearn.multioutput import MultiOutputRegressor
from sklearn.linear_model import Ridge


if __name__ == '__main__':
    print('Starting training job...')

    # Passing in environment variables and hyperparameters for our training script
    parser = argparse.ArgumentParser()

    # Sagemaker specific arguments. Defaults are set in the environment variables.
    parser.add_argument('--model-dir', type=str, default=os.environ['SM_MODEL_DIR'])
    parser.add_argument('--train', type=str, default=os.environ['SM_CHANNEL_TRAIN'])
    parser.add_argument("--output-data-dir", type=str, default=os.environ["SM_OUTPUT_DATA_DIR"])
    parser.add_argument('--alpha', type=float, default=10)

    args = parser.parse_args()

    # Log the received arguments
    print(f'Received arguments: {args}')

    # Extracting the arguments
    alpha = args.alpha
    model_dir = args.model_dir
    train_dataset_dir = args.train

    print('Loading training data...')
    # Load train datasets
    train_data = pd.read_csv(os.path.join(train_dataset_dir, 'train.csv'))

    # labels are in the last 14 columns
    X_train = train_data.iloc[:, :-14]
    y_train = train_data.iloc[:, -14:]

    print('Training data loaded successfully. Starting model training...')
    # Fit the model
    regressor = MultiOutputRegressor(Ridge(alpha=alpha, random_state=42))
    regressor.fit(X_train, y_train)
    print('Model training completed.')

    # Save the model
    model_path = os.path.join(model_dir, "model.joblib")
    joblib.dump(regressor, model_path)
    print(f'Model saved at {model_path}')
