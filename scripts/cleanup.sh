#!/bin/bash

set -e

echo "Cleaning up Infrastructure Stack"

pushd ./infrastructure
echo 'Installing dependencies'
yarn

echo 'Cleaning up Infrastructure Stack resources in your AWS account'
yarn cdk destroy --force
popd

echo "Cleaning up Model Deploy Stack"
# This stack is created/updated in the Deploy stage of the CodePipeline
pushd ./model_deploy
echo 'Installing dependencies'
yarn

echo 'Cleaning up Model Deploy Stack resources in your AWS account'
yarn cdk destroy --force
popd

echo "Deleting SageMaker Pipeline using cli"
# The SageMaker Pipeline is created/updated in the MLPipeline stage of the CodePipeline
PROJECT_NAME=`cat ./configuration/projectConfig.json | jq .projectName -r`
PIPELINE_ARN=`aws sagemaker list-pipelines --pipeline-name-prefix ${PROJECT_NAME} \
    | jq ".PipelineSummaries | .[] | select(.PipelineName==\"${PROJECT_NAME}\") | .PipelineArn"`

echo PIPELINE_ARN=${PIPELINE_ARN}

if [ ! -z "$PIPELINE_ARN" ]
then
    echo "Deleting SageMaker Pipeline ${PIPELINE_ARN}"
    aws sagemaker delete-pipeline --pipeline-name ${PROJECT_NAME} 
fi
