// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import { DataType, AddLabelRequest } from '@aws-prototype/model-consumer-online-data-type';

const sageMakerEndpointName = process.env.SAGEMAKER_ENDPOINT_NAME || '';
const dataTableName = process.env.DATA_TABLE_NAME || '';

const region = process.env.AWS_REGION;
AWS.config.update({ region });

const sagemaker = new AWS.SageMakerRuntime();
const documentClient = new AWS.DynamoDB.DocumentClient();

const getInput = (data: DataType): string => {
    return `${data.sex},${data.length},${data.diameter},${data.height},${data.wholeWeight},${data.shuckedWeight},${data.visceraWeight},${data.shellWeight}`;
};

const getInference = async (id: string, data: DataType) => {
    const inputString = getInput(data);
    console.log('Input data: ', inputString);
    const result = await sagemaker
        .invokeEndpoint({
            Body: inputString,
            EndpointName: sageMakerEndpointName,
            ContentType: 'text/csv',
            Accept: 'application/json',
        })
        .promise();

    const predict = result.Body.toString();
    console.log('Prediction: ', predict);
    //Write to DynamoDB with predict value
    const record = {
        ...data,
        id,
        predict,
    };
    const dynamoDBPutRequest = {
        TableName: dataTableName,
        Item: {
            ...record,
        },
    };
    await documentClient.put(dynamoDBPutRequest).promise();
    return record;
};

const addLabel = async (id: string, { actual }: AddLabelRequest) => {
    const updateExpression = 'SET actual = :a';
    const params = {
        TableName: dataTableName,
        Key: {
            id,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
            ':a': actual,
        },
        ReturnValues: 'ALL_NEW',
    };
    const response = await documentClient.update(params).promise();
    return response.$response.data;
};

export { getInference, addLabel };
