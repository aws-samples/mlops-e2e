/** *******************************************************************************************************************
Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                                              *
 ******************************************************************************************************************** */
import * as AWS from 'aws-sdk';

AWS.config.update({ region: process.env.AWS_REGION });

const sagemaker = new AWS.SageMaker();

const createModel = async (projectName: string, modelPackageName: string, executionRoleArn: string) => {
    const date = new Date();
    const modelName = `${projectName}-${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}-${date.getUTCMinutes()}-${date.getUTCSeconds()}-${date.getUTCMilliseconds()}`;
    console.log(`Creating model ${modelName} for modelPackageName: ${modelPackageName} with role ${executionRoleArn}`)
    const modelPackage = await sagemaker.describeModelPackage({
        ModelPackageName: modelPackageName
    }).promise();

    await sagemaker.createModel({
        ModelName: modelName,
        Containers: modelPackage.InferenceSpecification?.Containers?.map(
            c => ({
                Image: c.Image,
                ModelDataUrl: c.ModelDataUrl,
                Environment: c.Environment
            })
        ),
        ExecutionRoleArn: executionRoleArn
    }).promise();

    return {
        'PhysicalResourceId': modelName
    }
}

const deleteModel = async (modelName: string) => {
    console.log('Deleting model: ', modelName);
    await sagemaker.deleteModel({
        ModelName: modelName
    });
    console.log('Deleted model: ', modelName);
    return {};
}

const dispatch = async (event: any, requestType: string) => {
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

exports.handler = async (event: any) => {
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
