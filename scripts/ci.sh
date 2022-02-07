#!/bin/bash

set -e

bash ./scripts/test.sh

pushd ./infrastructure
yarn install
yarn lint
yarn build
yarn cdk synth
popd

pushd ./model_deploy
yarn install
yarn lint
yarn build
yarn cdk synth
popd

pushd ./consumers/online
yarn install
yarn lint
yarn build
yarn cdk synth
popd
