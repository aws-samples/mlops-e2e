# Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                                              *

"""Feature engineers the abalone dataset."""
import argparse
import logging
import os
import pathlib
import json

import boto3
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

import joblib
import tarfile

feature_columns_names = [
    "sex",
    "length",
    "diameter",
    "height",
    "whole_weight",
    "shucked_weight",
    "viscera_weight",
    "shell_weight",
]

label_column = "rings"

feature_columns_dtype = {
    "sex": str,
    "length": np.float64,
    "diameter": np.float64,
    "height": np.float64,
    "whole_weight": np.float64,
    "shucked_weight": np.float64,
    "viscera_weight": np.float64,
    "shell_weight": np.float64,
}

label_column_dtype = {"rings": np.float64}

class DataProcessor:
    @property
    def _logger(self):
        return logging.getLogger(__name__)

    def __init__(self, input_data) -> None:
        self._input_data = input_data
        self._logger.debug("Defining transformers.")
        numeric_features = list(feature_columns_names)
        numeric_features.remove("sex")
        numeric_transformer = Pipeline(
            steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
        )

        categorical_features = ["sex"]
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="constant", fill_value="missing")),
                ("onehot", OneHotEncoder(handle_unknown="ignore")),
            ]
        )

        self._preprocess = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numeric_features),
                ("cat", categorical_transformer, categorical_features),
            ]
        )

        self._logger.debug("Fitting transforms.")
        self._input_data_y = self._input_data.pop("rings")
        self._preprocess.fit(self._input_data)

    def save_model(self, model_path):
        model_joblib_path = os.path.join(model_path, "model.joblib")
        model_tar_path = os.path.join(model_path, "model.tar.gz")
        joblib.dump(self._preprocess, model_joblib_path)
        tar = tarfile.open(model_tar_path, "w:gz")
        tar.add(model_joblib_path, arcname="model.joblib")
        tar.close()

    def process(self):
        self._logger.debug("Applying transforms.")
        x_pre = self._preprocess.transform(self._input_data)
        y_pre = self._input_data_y.to_numpy().reshape(len(self._input_data_y), 1)

        return np.concatenate((y_pre, x_pre), axis=1)

    def merge_two_dicts(x, y):
        """Merges two dicts, returning a new copy."""
        z = x.copy()
        z.update(y)
        return z

class DataBuilder: 
    @property
    def _logger(self):
        return logging.getLogger(__name__)

    @property
    def data_manifest(self):
        return self._data_manifest

    def __init__(self, base_dir, data_manifest) -> None:
        self._base_dir = base_dir
        self._data_manifest = json.loads(data_manifest)

    def build(self):
        self._logger.info("Loading data from data manifest %s", self._data_manifest)
        data_paths = self._data_manifest.get("data")

        df_array = []
        for index, value in enumerate(data_paths):
            df = self._download_file(index, value["bucketName"], value["objectKey"])
            df_array.append(df)

        if len(df_array):
            return pd.concat(df_array)

    def _download_file(self, index, bucket, key):
        pathlib.Path(f"{self._base_dir}/data").mkdir(parents=True, exist_ok=True)

        self._logger.info("Downloading data from bucket: %s, key: %s", bucket, key)
        fn = f"{self._base_dir}/data/{index}.csv"
        s3 = boto3.resource("s3")
        s3.Bucket(bucket).download_file(key, fn)

        self._logger.debug("Reading raw input data.")
        df = pd.read_csv(
            fn,
            header=None,
            names=feature_columns_names + [label_column],
            dtype=DataProcessor.merge_two_dicts(feature_columns_dtype, label_column_dtype),
        )
        os.unlink(fn)   
        return df

def run_main():
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    logger.addHandler(logging.StreamHandler())
    logger.debug("Starting preprocessing.")

    parser = argparse.ArgumentParser()
    parser.add_argument("--data-manifest", type=str, required=True)
    args = parser.parse_args()

    logger.debug("Downloading raw input data")
    base_dir = "/opt/ml/processing"
    data_builder = DataBuilder(base_dir, args.data_manifest)
    df = data_builder.build()

    logger.debug("Preprocessing raw input data")
    data_processor = DataProcessor(df)
    data_output = data_processor.process()

    len_data_output = len(data_output)
    logger.info("Splitting %d rows of data into train, validation, test datasets.", len_data_output)
    np.random.shuffle(data_output)
    train, validation, test = np.split(
        data_output, [int(0.7 * len_data_output), int(0.85 * len_data_output)]
    )

    logger.info("Writing out datasets to %s.", base_dir)
    pd.DataFrame(train).to_csv(f"{base_dir}/train/train.csv", header=False, index=False)
    pd.DataFrame(validation).to_csv(
        f"{base_dir}/validation/validation.csv", header=False, index=False
    )
    pd.DataFrame(test).to_csv(f"{base_dir}/test/test.csv", header=False, index=False)

    logger.info("Saving the preprocessing model to %s", base_dir)
    data_processor.save_model(os.path.join(base_dir, "model"))

if __name__ == "__main__":
    run_main()
