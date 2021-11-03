#!/bin/bash

set -e

echo "Installing dependencies"
yarn

echo "Destroying CDK Stack"
pushd ./infrastructure
cdk destroy --force
popd