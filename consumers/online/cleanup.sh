#!/bin/bash

set -e

echo "Installing dependencies"
yarn install

echo "Destroying CDK Stack"
yarn cdk destroy --force
