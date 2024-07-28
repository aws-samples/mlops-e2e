#!/bin/bash

set -e

# Bootstrap the MLOps infrastructure
pushd ./infrastructure
echo 'Installing dependencies'
yarn install 

pushd ./functions/dataSourceMonitor
echo 'Installing dependencies for functions'
yarn install 
popd

echo 'Deploying Insfrastructure in your AWS account'
yarn cdk bootstrap
yarn cdk deploy --require-approval never
