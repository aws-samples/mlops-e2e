#!/bin/bash

set -e

bash ./scripts/test.sh

pushd ./infrastructure

pushd ./functions/dataSourceMonitor
yarn install --frozen-lockfile
popd

yarn install --frozen-lockfile
yarn lint
yarn build
yarn cdk synth
popd

pushd ./model_deploy

pushd ./customResources/pipelineModel
yarn install 
popd

yarn install 
yarn lint
yarn build
yarn cdk synth
popd

pushd ./consumers/online

pushd ./packages/data-api
yarn install 
popd

yarn install 
yarn lint
yarn build
yarn cdk synth
popd
