// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { SageMakerRuntimeClient, InvokeEndpointCommand } from '@aws-sdk/client-sagemaker-runtime';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'; // Used for converting data to DynamoDB format
import { DataType, AddLabelRequest } from '@aws-prototype/model-consumer-online-data-type';

const sageMakerEndpointName = process.env.SAGEMAKER_ENDPOINT_NAME || '';
const dataTableName = process.env.DATA_TABLE_NAME || '';
const region = process.env.AWS_REGION || '';

// Initialize AWS SDK v3 clients
const sagemaker = new SageMakerRuntimeClient({ region });
const dynamoDBClient = new DynamoDBClient({ region });

const getInput = (data: DataType): string => {
    return `${data.sex},${data.length},${data.diameter},${data.height},${data.wholeWeight},${data.shuckedWeight},${data.visceraWeight},${data.shellWeight}`;
};

const getInference = async (id: string, data: DataType) => {
    const inputString = getInput(data);
    console.log('Input data: ', inputString);

    // Invoke SageMaker endpoint using v3
    const invokeCommand = new InvokeEndpointCommand({
        Body: new TextEncoder().encode(inputString),
        EndpointName: sageMakerEndpointName,
        ContentType: 'text/csv',
        Accept: 'application/json',
    });

    const result = await sagemaker.send(invokeCommand);
    const predict = (result.Body && new TextDecoder().decode(result.Body)) || '';
    console.log('Prediction: ', predict);

    // Write to DynamoDB with the predicted value
    const record = {
        ...data,
        id,
        predict,
    };

    const dynamoDBPutCommand = new PutItemCommand({
        TableName: dataTableName,
        Item: marshall(record),
    });

    await dynamoDBClient.send(dynamoDBPutCommand);

    return record;
};

const addLabel = async (id: string, { actual }: AddLabelRequest) => {
    const updateExpression = 'SET actual = :a';

    const updateCommand = new UpdateItemCommand({
        TableName: dataTableName,
        Key: marshall({
            id,
        }),
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: marshall({
            ':a': actual,
        }),
        ReturnValues: 'ALL_NEW',
    });

    const response = await dynamoDBClient.send(updateCommand);
    return response.Attributes ? unmarshall(response.Attributes) : {};
};

export { getInference, addLabel };
