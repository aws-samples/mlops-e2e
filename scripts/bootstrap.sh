#!/bin/bash

set -e

# Bootstrap the MLOps infrastructure
pushd ./infrastructure
echo 'Installing dependencies'
yarn install --frozen-lockfile

pushd ./functions/dataSourceMonitor
echo 'Installing dependencies for functions'
yarn install --frozen-lockfile
popd

echo 'Deploying Insfrastructure in your AWS account'
yarn cdk bootstrap
yarn cdk deploy --require-approval never
