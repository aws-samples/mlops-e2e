#!/bin/bash

# Get the list of all buckets starting with 'mlops'
buckets=$(aws s3api list-buckets --query "Buckets[?starts_with(Name, 'mlops')].Name" --output text)

# Convert the list of buckets to an array
bucket_array=($buckets)

# Iterate over each bucket and delete its contents and the bucket itself
for bucket in "${bucket_array[@]}"; do
    # Remove leading and trailing whitespace from the bucket name
    bucket=$(echo $bucket | xargs)

    if [ -n "$bucket" ]; then
        echo "Deleting all objects in bucket: $bucket"
        aws s3 rm s3://$bucket --recursive

        echo "Deleting bucket: $bucket"
        aws s3api delete-bucket --bucket $bucket
    else
        echo "Skipping empty bucket name"
    fi
done
