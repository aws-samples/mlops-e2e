#!/bin/bash

set -e

# Navigate to the ml_pipeline directory
cd $CODEBUILD_SRC_DIR/ml_pipeline

# Set up the virtual environment in the correct directory
python3 -m venv .venv
source .venv/bin/activate 

# Upgrade pip to avoid compatibility issues
pip install --upgrade pip

# Install Cython first
pip install Cython

# Install requirements
pip install -r requirements.txt

echo "Starting Pipeline Execution"
export PYTHONUNBUFFERED=TRUE
python run_pipeline.py --module-name pipeline \
       --role-arn $SAGEMAKER_PIPELINE_ROLE_ARN \
       --tags "[{\"Key\":\"sagemaker:project-name\", \"Value\":\"${SAGEMAKER_PROJECT_NAME}\"}]" \
       --kwargs "{\"region\":\"${AWS_REGION}\",\"role\":\"${SAGEMAKER_PIPELINE_ROLE_ARN}\",\"default_bucket\":\"${SAGEMAKER_ARTIFACT_BUCKET}\",\"pipeline_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"model_package_group_name\":\"${SAGEMAKER_PROJECT_NAME}\",\"base_job_prefix\":\"${SAGEMAKER_PROJECT_NAME}\"}"

echo "Create/Update of the SageMaker Pipeline and execution Completed."

# Deactivate the virtual environment
deactivate

# Export the MODEL_PACKAGE_NAME from the pipeline execution output
export MODEL_PACKAGE_NAME=`cat $CODEBUILD_SRC_DIR/ml_pipeline/pipelineExecutionArn` 
echo "{\"arn\": \"${MODEL_PACKAGE_NAME}\"}" > $CODEBUILD_SRC_DIR/ml_pipeline/pipelineExecution.json
