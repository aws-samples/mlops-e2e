#!/bin/bash

set -e

echo 'Installing dependencies'
yarn

echo 'Building assets'
yarn build

echo 'Deploying Infrastructure Stack in your AWS account'
yarn cdk deploy --require-approval never