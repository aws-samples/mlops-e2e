#!/bin/bash

set -e

# Clean up the MLOps infrastructure resources 

pushd ./infrastructure
echo 'Cleaning up resources in your AWS account'
cdk destory
popd