#!/bin/bash

set -e

bash ./scripts/test.sh

pushd ./infrastructure
yarn install
yarn lint
yarn build
popd

pushd ./model_deploy
yarn install
yarn lint
yarn build
popd

pushd ./consumers/online
yarn install
yarn lint
yarn build
popd
