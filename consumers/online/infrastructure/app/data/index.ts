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
import { getInference, addLabel } from './data';

const corsHeader = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
};

const dispatch = async (event: any, context: any) => {
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

exports.handler = async (event: any, context: any) => {
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
        const message = typeof e === 'string' ? e : e.message;
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
