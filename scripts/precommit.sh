#!/bin/bash

set -e

pushd ./infrastructure 
yarn lint
popd

pushd ./model_deploy
yarn lint
popd

pushd ./consumers/online
pushd ./infrastructure
yarn lint
popd

pushd ./website
yarn lint
popd