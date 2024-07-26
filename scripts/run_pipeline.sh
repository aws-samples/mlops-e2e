#!/bin/bash

set -e

# Logging function
log() {
  echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')]: $*"
}

log "Starting run_pipeline.sh script..."

# Create/Update the SageMaker Pipeline and wait for the execution to be completed

VIRTUAL_ENV=.venv
DATA_MANIFEST=$(cat ./dataManifest.json)

log "Data manifest loaded: $DATA_MANIFEST"

pushd ml_pipeline

log "Setting up and activating virtual environment"
source ../$VIRTUAL_ENV/bin/activate 

log "Starting Pipeline Execution"
export PYTHONUNBUFFERED=TRUE

python run_pipeline.py --module-name pipeline \
        --role-arn $SAGEMAKER_PIPELINE_ROLE_ARN \
        --tags "[{\"Key\":\"sagemaker:project-name\", \"Value\":\"${SAGEMAKER_PROJECT_NAME}\"}]" \
        --kwargs "{\"region\":\"${AWS_REGION}\",\"role\":\"${SAGEMAKER_PIPELINE_ROLE_ARN}\",\"default_bucket\":\"${SAGEMAKER_ARTIFACT_BUCKET}\",\"pipeline_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"model_package_group_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"base_job_prefix\":\"${SAGEMAKER_PROJECT_NAME}\"}"

log "Pipeline execution completed"

log "Deactivating virtual environment"
deactivate

popd

export MODEL_PACKAGE_NAME=$(cat ml_pipeline/pipelineExecutionArn) 
log "Model package name: $MODEL_PACKAGE_NAME"

echo "{\"arn\": \"${MODEL_PACKAGE_NAME}\"}" > pipelineExecution.json
log "Pipeline execution JSON created"