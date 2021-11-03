#!/bin/bash

set -e

# Bootstrap the MLOps infrastructure

pushd ./infrastructure
echo 'Installing dependencies'
yarn

echo 'Deploying Insfrastructure in your AWS account'
cdk deploy --require-approval never

popd