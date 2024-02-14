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
# from datetime import timedelta

import boto3
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer, make_column_selector
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder, FunctionTransformer

import joblib
import tarfile
from scipy.sparse import issparse

feature_columns_names = [
    'Date',
    'location_id',
    'location_parking_type_id',
    'count_of_trx'
]

label_column = ['count_of_trx_1_day_ahead', 'count_of_trx_2_day_ahead', 'count_of_trx_3_day_ahead',
                'count_of_trx_4_day_ahead', 'count_of_trx_5_day_ahead', 'count_of_trx_6_day_ahead',
                'count_of_trx_7_day_ahead', 'count_of_trx_8_day_ahead', 'count_of_trx_9_day_ahead',
                'count_of_trx_10_day_ahead', 'count_of_trx_11_day_ahead', 'count_of_trx_12_day_ahead',
                'count_of_trx_13_day_ahead', 'count_of_trx_14_day_ahead']

feature_columns_dtype = {
    "location_id": np.int64,
    "location_parking_type_id": np.int64,
    "count_of_trx": np.int64
}

parse_dates = ['Date']

label_column_dtype = {'count_of_trx_1_day_ahead': np.int64, 'count_of_trx_2_day_ahead': np.int64,
                      'count_of_trx_3_day_ahead': np.int64, 'count_of_trx_4_day_ahead': np.int64,
                      'count_of_trx_5_day_ahead': np.int64, 'count_of_trx_6_day_ahead': np.int64,
                      'count_of_trx_7_day_ahead': np.int64, 'count_of_trx_8_day_ahead': np.int64,
                      'count_of_trx_9_day_ahead': np.int64, 'count_of_trx_10_day_ahead': np.int64,
                      'count_of_trx_11_day_ahead': np.int64, 'count_of_trx_12_day_ahead': np.int64,
                      'count_of_trx_13_day_ahead': np.int64, 'count_of_trx_14_day_ahead': np.int64}


class DataProcessor:
    @property
    def _logger(self):
        return logging.getLogger(__name__)

    def __init__(self, input_data) -> None:
        self._input_data = input_data
        self._logger.debug("Defining transformers.")
        # prepare the data for time series forecasting
        self._input_data = self.preprocess_data()
        # prepare_train_and_prediction_data
        self._input_data, self.data_to_predict = self.prepare_train_and_prediction_data()
        # specify numerical features
        numeric_features = ['count_of_trx_lag_1', 'count_of_trx_lag_7', 'count_of_trx_lag_14']

        numeric_transformer = Pipeline(
            steps=[("scaler", StandardScaler())]
        )

        categorical_features = ["location_id"]
        categorical_transformer = Pipeline(
            steps=[("onehot", OneHotEncoder(handle_unknown="ignore"))])

        # Pipeline with FunctionTransformer for cyclic encoding
        cyclic_encoder_day = FunctionTransformer(cyclic_encode_weekday)
        cyclic_encoder_month = FunctionTransformer(cyclic_encode_month)

        self._preprocess = ColumnTransformer(
            transformers=[
                ("cat", categorical_transformer, categorical_features),
                ("num", numeric_transformer, numeric_features),
                ("cyclic_day", cyclic_encoder_day, make_column_selector(pattern="weekday")),
                ("cyclic_month", cyclic_encoder_month, make_column_selector(pattern="month"))
            ]
        )

        self._logger.debug("Fitting transforms.")
        self._input_data_y = self._input_data[label_column]
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
        x_location_features = self._input_data[["location_id"]].copy().to_numpy()

        x_pre = self._preprocess.transform(self._input_data)
        x_pre = convert_if_csr_matrix(x_pre)
        y_pre = self._input_data_y.to_numpy()  # .reshape(len(self._input_data_y), 1)

        data_to_predict_location_feature = self.data_to_predict[["location_id"]].copy().to_numpy()
        data_to_predict_location_type_feature = self.data_to_predict[["location_parking_type_id"]].copy().to_numpy()
        data_to_predict_Date_feature = pd.DataFrame(self.data_to_predict.index).astype(str).to_numpy()

        data_to_predict_pre = self._preprocess.transform(self.data_to_predict)
        data_to_predict_pre = convert_if_csr_matrix(data_to_predict_pre)

        return (np.concatenate((x_location_features, x_pre, y_pre), axis=1),
                np.concatenate((data_to_predict_Date_feature, data_to_predict_location_feature,
                                data_to_predict_location_type_feature, data_to_predict_pre), axis=1))

    def merge_two_dicts(x, y):
        """Merges two dicts, returning a new copy."""
        z = x.copy()
        z.update(y)
        return z

    def preprocess_data(self) -> pd.DataFrame:
        """ Add feature lags and prediction steps for time series forecasting  """

        # impute missing values
        df = ffill_imputer(self._input_data, feature_columns="count_of_trx")

        # Format count_of_trx and Date
        df["count_of_trx"] = df["count_of_trx"].astype("Int64")
        df['Date'] = pd.to_datetime(df['Date'], format='%Y-%m-%d')

        # exclude the data after the day-1 of the run
        today = pd.Timestamp("today").strftime("%Y-%m-%d")
        df = df[df["Date"] < today].copy()

        # Add time-based features
        df['month'] = df['Date'].dt.month
        df['weekday'] = df['Date'].dt.dayofweek

        # Add lags for Reservations
        df = df.groupby(['location_id', 'location_parking_type_id']).apply(add_lagged_features, column='count_of_trx',
                                                                           lags=[1, 7, 14]).reset_index(drop=True)

        # Add a multistep target for Reservations
        df = df.groupby(['location_id', 'location_parking_type_id']).apply(add_multistep_target, 'count_of_trx',
                                                                           multisteps=14).reset_index(drop=True)
        # Set Date as Index
        df.set_index('Date', inplace=True)

        # Drop Nans
        # df.dropna(inplace=True)

        return df

    def prepare_train_and_prediction_data(self):
        preprocessed_data = self._input_data.copy()
        preprocessed_data["Date"] = self._input_data.index

        #todo
        # current_date = (pd.Timestamp("today") - timedelta(1)).strftime("%Y-%m-%d")
        current_date = preprocessed_data["Date"].max().strftime("%Y-%m-%d")

        # train_data = preprocessed_data[~preprocessed_data["count_of_trx_14_day_ahead"].isnull()]
        train_data = preprocessed_data[preprocessed_data["Date"] < current_date]

        # prediction_data = preprocessed_data[preprocessed_data["count_of_trx_14_day_ahead"].isnull()]
        prediction_data = preprocessed_data[preprocessed_data["Date"] == current_date]

        data_for_modeling = train_data.dropna().copy()

        data_to_predict = prediction_data.drop(label_column, axis=1).dropna().copy()

        return data_for_modeling, data_to_predict


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
            usecols=feature_columns_names,
            # header=None,
            # names=feature_columns_names,
            dtype=feature_columns_dtype,
            parse_dates=parse_dates
        )
        os.unlink(fn)
        return df


class DataSplitter:
    @property
    def _logger(self):
        return logging.getLogger(__name__)

    def __init__(self, input_data) -> None:
        self._input_data = input_data
        self._logger.debug("Splitting data into train and test")

    def split_data(self):
        """
        Split time series data into train and test sets
        :param input_data: NumPy array containing time series data
        :return: NumPy arrays for training and testing sets
        """
        train_time_list = []
        test_time_list = []

        unique_sites = np.unique(self._input_data[:, 0])

        # Iterate over each unique site
        for site in unique_sites:
            site_data = self._input_data[self._input_data[:, 0] == site]

            # Determine the train-test split for the specific site
            # ======================================================================================
            train_size_site = int(0.80 * len(site_data))
            train_data_site = site_data[:train_size_site, 1:]
            test_data_site = site_data[train_size_site:, 1:]

            # Append the data to respective lists
            train_time_list.append(train_data_site[:, :])
            test_time_list.append(test_data_site[:, :])

        # Concatenate the data
        train_time_combined = np.concatenate(train_time_list, axis=0)
        test_time_combined = np.concatenate(test_time_list, axis=0)

        return train_time_combined, test_time_combined


def add_lagged_features(group, column, lags):
    for lag in lags:
        group[f'{column}_lag_{lag}'] = group[column].shift(lag)
    return group


# Define a function to create a multistep data
def add_multistep_target(group, column, multisteps):
    for multistep in range(1, multisteps + 1):
        group[f'{column}_{multistep}_day_ahead'] = group[column].shift(-multistep)
    return group


def ffill_imputer(data, feature_columns):
    """
    forward fill missing values for each location
    """
    df_copy = data.copy()
    # Format Date
    df_copy['Date'] = pd.to_datetime(df_copy['Date'], format='%Y-%m-%d')

    # Drop duplicates to avoid reindexing issues
    df_copy = df_copy.drop_duplicates()

    # Sort the DataFrame by 'location_id' and Date
    df_sorted = df_copy.sort_values(by=['location_id', 'location_parking_type_id', 'Date']).set_index('Date')



    # Group by 'location_id' and forward fill within each group
    filled_data = df_sorted.groupby(['location_id', 'location_parking_type_id']).apply(
        lambda x: x.asfreq('1D')[feature_columns].ffill())

    # # reset index
    filled_data = filled_data.reset_index()

    return filled_data


# Function to perform cyclic encoding for Day of the Week
def cyclic_encode_weekday(df):
    num_days = 7
    df['weekday_Sin'] = np.sin(2 * np.pi * df['weekday'] / num_days)
    df['weekday_Cos'] = np.cos(2 * np.pi * df['weekday'] / num_days)
    df = df.drop(columns=["weekday"])
    return df


# Function to perform cyclic encoding for Month
def cyclic_encode_month(df):
    num_months = 12
    df['month_Sin'] = np.sin(2 * np.pi * df['month'] / num_months)
    df['month_Cos'] = np.cos(2 * np.pi * df['month'] / num_months)
    df = df.drop(columns=["month"])
    return df


def convert_if_csr_matrix(sparse_matrix):
    if issparse(sparse_matrix):  # Check if the input is a sparse matrix
        return sparse_matrix.toarray()  # Convert to a dense numpy array
    else:
        return sparse_matrix  # Return the original matrix if it's not sparse


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
    data_output, data_to_predict = data_processor.process()

    len_data_output = len(data_output)
    logger.info("Splitting %d rows of data into train, validation, test datasets.", len_data_output)
    data_splitter = DataSplitter(data_output)
    train, test = data_splitter.split_data()

    logger.info("Writing out datasets to %s.", base_dir)
    pd.DataFrame(train).to_csv(f"{base_dir}/train/train.csv", header=False, index=False)
    pd.DataFrame(test).to_csv(f"{base_dir}/test/test.csv", header=False, index=False)
    pd.DataFrame(data_to_predict).to_csv(f"{base_dir}/transform/data_to_predict.csv", header=False, index=False)

    logger.info("Saving the preprocessing model to %s", base_dir)
    data_processor.save_model(os.path.join(base_dir, "model"))


if __name__ == "__main__":
    run_main()
