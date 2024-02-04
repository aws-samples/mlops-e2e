import os
import joblib
import pandas as pd
from io import StringIO

# Function to load the model
def model_fn(model_dir):
    """Load the model from the directory."""
    model_path = os.path.join(model_dir, 'model.joblib')
    model = joblib.load(model_path)
    return model

# Function to deserialize the input data
def input_fn(request_body, request_content_type):
    """Parse input data payload."""
    if request_content_type == 'text/csv':
        data = pd.read_csv(StringIO(request_body), header=None)
        return data
    else:
        raise ValueError(f"Unsupported content type: {request_content_type}")

# Function to predict
def predict_fn(input_data, model):
    """Run predictions using the model."""
    predictions = model.predict(input_data)
    return predictions

# Function to serialize the predictions
def output_fn(prediction, accept):
    """Format predictions into the correct format."""
    if accept == "application/json":
        return prediction.to_json()
    elif accept == "text/csv":
        return prediction.to_csv(index=False)
    else:
        raise ValueError(f"Unsupported accept type: {accept}")
