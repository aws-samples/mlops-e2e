#!/bin/bash

set -e

echo 'Installing dependencies'
yarn

pushd ./website
echo 'Building website assets'
yarn build
popd

pushd ./infrastructure
echo 'Deploying Infrastructure Stack in your AWS account'
cdk deploy --require-approval never
popd