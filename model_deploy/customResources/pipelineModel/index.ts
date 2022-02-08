// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';

AWS.config.update({ region: process.env.AWS_REGION });

const sagemaker = new AWS.SageMaker();

interface CustomResourceEvent {
    RequestType: string;
    PhysicalResourceId: string;
    ResourceProperties: {
        projectName: string;
        modelPackageName: string;
        sagemakerExecutionRole: string;
    };
}

const createModel = async (projectName: string, modelPackageName: string, executionRoleArn: string) => {
    const date = new Date();
    const modelName = `${projectName}-${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}-${date.getUTCSeconds()}-${date.getUTCMilliseconds()}`;
    console.log(`Creating model ${modelName} for modelPackageName: ${modelPackageName} with role ${executionRoleArn}`);
    const modelPackage = await sagemaker
        .describeModelPackage({
            ModelPackageName: modelPackageName,
        })
        .promise();

    await sagemaker
        .createModel({
            ModelName: modelName,
            Containers: modelPackage.InferenceSpecification?.Containers?.map((c) => ({
                Image: c.Image,
                ModelDataUrl: c.ModelDataUrl,
                Environment: c.Environment,
            })),
            ExecutionRoleArn: executionRoleArn,
        })
        .promise();

    return {
        PhysicalResourceId: modelName,
    };
};

const deleteModel = async (modelName: string) => {
    console.log('Deleting model: ', modelName);
    await sagemaker.deleteModel({
        ModelName: modelName,
    });
    console.log('Deleted model: ', modelName);
    return {};
};

const dispatch = async (event: CustomResourceEvent, requestType: string) => {
    const props = event['ResourceProperties'];
    const resourceId = event['PhysicalResourceId'];
    switch (requestType) {
        case 'Create':
        case 'Update':
            return createModel(props.projectName, props.modelPackageName, props.sagemakerExecutionRole);
        case 'Delete': {
            return deleteModel(resourceId);
        }
        default:
            throw 'Unsupported RequestType';
    }
};

exports.handler = async (event: CustomResourceEvent) => {
    console.log('Event: \n' + JSON.stringify(event, null, 2));
    try {
        const requestType = event['RequestType'];
        const data = await dispatch(event, requestType);
        console.log('Response', data);
        return data;
    } catch (e) {
        console.log('Error', e);
        throw e;
    }
};
