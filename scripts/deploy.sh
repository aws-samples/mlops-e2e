#!/bin/bash

set -e

pushd ./model_deploy
echo 'Installing dependencies'
yarn install --check-files

echo 'Deploying Model in your AWS account'

MODEL_PACKAGE_NAME=$(cat ${CODEBUILD_SRC_DIR_PipelineOutput}/pipelineExecution.json | jq ".arn" -r)

echo MODEL_PACKAGE_NAME=${MODEL_PACKAGE_NAME}

yarn cdk deploy --require-approval never --parameters modelPackageName=${MODEL_PACKAGE_NAME} --app cdk.out/

popd
