#!/bin/bash

set -e

# Clean up the MLOps infrastructure resources 

pushd ./infrastructure
echo 'Cleaning up resources in your AWS account'
cdk destory
popd

PROJECT_NAME=`cat ./configuration/projectConfig.json | jq .projectName -r`
CLOUDFORMATION_STACK_ML_PIPELINE_NAME=ModelConsumerOnlineInfrastructureStack-${PROJECT_NAME}

aws cloudformation delete-stack --stack-name ${CLOUDFORMATION_STACK_ML_PIPELINE_NAME} &  