#!/bin/bash

set -e

# Bootstrap the MLOps infrastructure

pushd ./infrastructure
echo 'Installing dependencies'
yarn

echo 'Bootstraping CDK in your AWS account'
cdk bootstrap
echo 'Deploying Insfrastructure in your AWS account'
cdk deploy --require-approval never

popd