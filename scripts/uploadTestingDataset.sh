##!/bin/bash
#
#set -e
#
## Download the testing data set and upload it to the Source Data Bucket if the data bucket is empty
#
#TEMP_FOLDER=.tmp
#
#echo "Getting the Data Bucket Name"
#DATA_BUCKET_NAME=`aws cloudformation list-exports --query "Exports[?Name=='MLOpsE2EDemo-DataBucket'].Value" --output text`
#echo "DATA_BUCKET_NAME=${DATA_BUCKET_NAME}"
#
#echo "Checking whether the Data Bucket is empty"
#DATA_BUCKET_OBJECTS_COUNT=`aws s3 ls s3://${DATA_BUCKET_NAME}/ --recursive | wc -l | sed 's/^ *//g'`
#echo "DATA_BUCKET_OBJECTS_COUNT=${DATA_BUCKET_OBJECTS_COUNT}"
#
#if [ "${DATA_BUCKET_OBJECTS_COUNT}" == "0" ]; then
#     [ -d ${TEMP_FOLDER} ] || mkdir ${TEMP_FOLDER}
#
#    echo "Download the testing data set"
#    wget -O ${TEMP_FOLDER}/abalone.csv https://archive.ics.uci.edu/ml/machine-learning-databases/abalone/abalone.data
#
#    echo "Upload the tersting data set to the data bucket under yyyy/mm/dd"
#    aws s3 cp ${TEMP_FOLDER}/abalone.csv s3://${DATA_BUCKET_NAME}/$(date +%Y)/$(date +%m)/$(date +%d)/abalone.csv
#else
#    echo "The S3 Data Bucket is not empty. Please delete all the objects and folders before running this script."
#fi
#


#!/bin/bash

set -e

# Download the testing data set and upload it to the Source Data Bucket if the data bucket is empty

TEMP_FOLDER=.tmp

echo "Getting the Data Bucket Name"
DATA_BUCKET_NAME=`aws cloudformation list-exports --query "Exports[?Name=='MLOpsE2EDemo-DataBucket'].Value" --output text`
echo "DATA_BUCKET_NAME=${DATA_BUCKET_NAME}"

echo "Checking whether the Data Bucket is empty"
DATA_BUCKET_OBJECTS_COUNT=`aws s3 ls s3://${DATA_BUCKET_NAME}/ --recursive | wc -l | sed 's/^ *//g'`
echo "DATA_BUCKET_OBJECTS_COUNT=${DATA_BUCKET_OBJECTS_COUNT}"

if [ "${DATA_BUCKET_OBJECTS_COUNT}" <> "0" ]; then
     [ -d ${TEMP_FOLDER} ] || mkdir ${TEMP_FOLDER}

    echo "Download the testing data set"
#    wget -O ${TEMP_FOLDER}/abalone.csv https://archive.ics.uci.edu/ml/machine-learning-databases/abalone/abalone.data
    echo "Running Python script to generate DataFrame"
    python3 - << EOF
import pandas as pd
import datetime

# Read CSV file
df = pd.read_csv("data/train_data_for_direct_prediction.csv", parse_dates=['Date'])

# Filter DataFrame
df = df[(df["Date"] >= "2021-03-01") & (df["Date"] < "2023-11-01")]
df = df[(df.location_city.isin(["Herndon", "New York"])) & ~(df["location_parking_type_id"].isin([197, 317, 337]))]
df = df[['Date', 'location_id', 'location_parking_type_id', 'count_of_trx']]

# Print DataFrame to CSV
df.to_csv("${TEMP_FOLDER}/data.csv", index=False)
EOF

    echo "Upload the testing data set to the data bucket under yyyy/mm/dd"
    aws s3 cp ${TEMP_FOLDER}/data.csv s3://${DATA_BUCKET_NAME}/$(date +%Y)/$(date +%m)/$(date +%d)/data.csv
else
    echo "The S3 Data Bucket is not empty. Please delete all the objects and folders before running this script."
fi

