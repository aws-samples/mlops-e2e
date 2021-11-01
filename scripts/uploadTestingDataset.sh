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

if [ "${DATA_BUCKET_OBJECTS_COUNT}" == "0" ]; then
    echo "Download the testing data set"
    wget --directory-prefix=${TEMP_FOLDER} https://s3-us-west-2.amazonaws.com/sparkml-mleap/data/abalone/abalone.csv

    echo "Upload the tersting data set to the data bucket under yyyy/mm/dd"
    aws s3 cp ${TEMP_FOLDER}/abalone.csv s3://${DATA_BUCKET_NAME}/$(date +%Y)/$(date +%m)/$(date +%d)/abalone.csv
else
    echo "The S3 Data Bucket is not empty. Please delete all the objects and folders before running this script."
fi

