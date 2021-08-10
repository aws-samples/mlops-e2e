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
import { DataType } from '../../../data-type';

const sageMakerEndpointName = process.env.SAGEMAKER_ENDPOINT_NAME || '';
const dataTableName = process.env.DATA_TABLE_NAME || '';

const region = process.env.AWS_REGION;
AWS.config.update({ region });

const sagemaker = new AWS.SageMakerRuntime();
const documentClient = new AWS.DynamoDB.DocumentClient();

const getInput = (data: DataType): string => {
    return `${data.length},${data.diameter},${data.height},${data.wholeWeight},${data.shuckedWeight},${
        data.visceraWeight
    },${data.shellWeight},${data.sex === 'M' ? 1 : 0},${data.sex === 'F' ? 1 : 0},${data.sex === 'I' ? 1 : 0}`;
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

const addLabel = async (id: string, { actual }: any) => {
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
