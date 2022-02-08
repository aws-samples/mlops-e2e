// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import getConfig from '../getConfig';

const apiPost = async <T>(path: string, data: any): Promise<T> => {
    const config = getConfig();

    const response = await fetch(`${config.apiUrl}${path}`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data),
    });

    return response.json();
};

export { apiPost };
