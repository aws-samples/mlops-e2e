#!/bin/bash

set -e

# Build the Model deployment package

pushd model_deploy

yarn
cdk synth

popd