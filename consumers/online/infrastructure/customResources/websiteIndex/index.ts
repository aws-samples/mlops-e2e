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
import * as fs from 'fs';
import archiver = require('archiver');

AWS.config.update({ region: process.env.AWS_REGION });

const s3 = new AWS.S3();

const buildIndexFile = (configContent: string, template: string) => {
    const indexFileContent = template.replace(/<script src="\/config.js"><\/script>/g, configContent);
    return indexFileContent;
};

const createZipFileContent = async (objectKey: string, indexFileContent: string) => {
    const filePath = `/tmp/${objectKey}`;
    const output = fs.createWriteStream(filePath);

    const closed = new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
    });

    const archiveHandler = archiver('zip');

    archiveHandler.pipe(output);

    archiveHandler.append(indexFileContent, { name: 'index.html' });

    archiveHandler.finalize();
    await closed;

    return fs.readFileSync(filePath);
};

const createOrUpdateConfig = async (config: Record<string, string>, template: string, s3BucketName: string) => {
    const objectKey = `${Date.now()}.zip`;
    const configContent = `<script>window.__config=${JSON.stringify(config, null, 0)}</script>`;
    const indexFileContent = buildIndexFile(configContent, template);

    if (indexFileContent.search(configContent) < 0) {
        console.log('Index file content:', indexFileContent);
        throw 'Failed in generating Index file';
    }

    const zipFileContent = await createZipFileContent(objectKey, indexFileContent);

    await s3
        .putObject({
            Bucket: s3BucketName,
            Key: objectKey,
            Body: zipFileContent,
        })
        .promise();

    return {
        PhysicalResourceId: objectKey,
    };
};

const deleteConfig = async (configKeyToDelete: string, s3BucketName: string) => {
    try {
        await s3
            .deleteObject({
                Bucket: s3BucketName,
                Key: configKeyToDelete,
            })
            .promise();
    } catch (e) {
        console.log('Error in deleting the old config object', e);
    }

    return {};
};

const dispatch = async (event: any, requestType: string) => {
    const props = event['ResourceProperties'];
    const resourceId = event['PhysicalResourceId'];
    switch (requestType) {
        case 'Create':
        case 'Update': {
            const { s3BucketName, template, ...data } = props;
            return createOrUpdateConfig(data, template, s3BucketName);
        }
        case 'Delete': {
            const { s3BucketName } = props;
            return deleteConfig(resourceId, s3BucketName);
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
