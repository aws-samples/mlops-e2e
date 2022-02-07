// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { getInference, addLabel } from './data';

const corsHeader = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

interface LambdaEvent {
    requestContext: {
        httpMethod: string;
    };
    pathParameters: {
        id: string;
    };
    body: string;
}

interface LambdaContext {
    awsRequestId: string;
}

const dispatch = async (event: LambdaEvent, context: LambdaContext) => {
    switch (event.requestContext.httpMethod) {
        case 'POST':
            if (event.pathParameters && event.pathParameters.id) {
                return addLabel(event.pathParameters.id, JSON.parse(event.body));
            }

            return getInference(context.awsRequestId, JSON.parse(event.body));
        default:
            throw 'Unsupoorted';
    }
};

exports.handler = async (event: LambdaEvent, context: LambdaContext) => {
    console.log('Event: \n' + JSON.stringify(event, null, 2));

    try {
        const response = await dispatch(event, context);
        return {
            statusCode: 200,
            headers: {
                ...corsHeader,
            },
            body: response && JSON.stringify(response),
        };
    } catch (e) {
        console.log('Error: ', e);
        const message = typeof e === 'string' ? e : (e as Error).message;
        return {
            statusCode: 500,
            headers: {
                ...corsHeader,
            },
            body: JSON.stringify({
                message,
            }),
        };
    }
};
