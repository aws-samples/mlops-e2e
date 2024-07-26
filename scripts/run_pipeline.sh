#!/bin/bash

set -e

# Create/Update the SageMaker Pipeline and wait for the execution to be completed

VIRTUAL_ENV=.venv
DATA_MANIFEST=$(cat ./dataManifest.json)

pushd ml_pipeline

# Activate virtual env
source ../$VIRTUAL_ENV/bin/activate 

echo "Starting Pipeline Execution"
export PYTHONUNBUFFERED=TRUE
python run_pipeline.py --module-name pipeline \
        --role-arn $SAGEMAKER_PIPELINE_ROLE_ARN \
        --tags "[{\"Key\":\"sagemaker:project-name\", \"Value\":\"${SAGEMAKER_PROJECT_NAME}\"}]" \
        --kwargs "{\"region\":\"${AWS_REGION}\",\"role\":\"${SAGEMAKER_PIPELINE_ROLE_ARN}\",\"default_bucket\":\"${SAGEMAKER_ARTIFACT_BUCKET}\",\"pipeline_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"model_package_group_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"base_job_prefix\":\"${SAGEMAKER_PROJECT_NAME}\"}"

echo "Create/Update of the SageMaker Pipeline and execution Completed."

# Deactivate virtual env
deactivate

popd

export MODEL_PACKAGE_NAME=$(cat ml_pipeline/pipelineExecutionArn) 
echo "{\"arn\": \"${MODEL_PACKAGE_NAME}\"}" > pipelineExecution.json