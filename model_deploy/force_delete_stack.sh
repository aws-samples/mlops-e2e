#!/bin/bash

STACK_NAME="Deployment-mlops-e2e"

# Get all resources
RESOURCES=$(aws cloudformation describe-stack-resources --stack-name $STACK_NAME --query "StackResources[*].{ResourceType:ResourceType,PhysicalResourceId:PhysicalResourceId}" --output text)

# Loop through each resource and delete it
echo "$RESOURCES" | while read RESOURCE_TYPE RESOURCE_ID; do
  echo "Deleting $RESOURCE_TYPE with ID $RESOURCE_ID"
  case $RESOURCE_TYPE in
    "AWS::Lambda::Function")
      aws lambda delete-function --function-name $RESOURCE_ID
      ;;
    "AWS::IAM::Role")
      aws iam delete-role --role-name $RESOURCE_ID
      ;;
    "AWS::S3::Bucket")
      aws s3 rb s3://$RESOURCE_ID --force
      ;;
    # Add more cases for other resource types as needed
  esac
done

# Finally, delete the stack
aws cloudformation delete-stack --stack-name $STACK_NAME
