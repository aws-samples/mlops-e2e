#!/bin/bash

set -e

pushd ./infrastructure
yarn lint:fix
popd

pushd ./model_deploy
yarn lint:fix
popd

pushd ./consumers/online
yarn lint:fix
popd
