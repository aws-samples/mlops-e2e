# Define a function to create the lagged feature
import numpy as np
import pandas as pd


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

    # Sort the DataFrame by 'location_id' and Date
    df_sorted = df_copy.sort_values(by=['location_id', 'location_parking_type_id', 'Date']).set_index('Date')

    # # Group by 'location_id' and forward fill within each group
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
