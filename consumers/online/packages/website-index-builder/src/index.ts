// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import archiver = require('archiver');

// Initialize the S3 client with region
const s3 = new S3Client({ region: process.env.AWS_REGION });

interface CustomResourceEvent {
    RequestType: string;
    PhysicalResourceId: string;
    ResourceProperties: {
        s3BucketName: string;
        template: string;
    } & Record<string, string>;
}

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

    await archiveHandler.finalize();
    await closed;

    return fs.readFileSync(filePath);
};

const createOrUpdateConfig = async (config: Record<string, string>, template: string, s3BucketName: string) => {
    const objectKey = `${Date.now()}.zip`;
    const configContent = `<script>window.__config=${JSON.stringify(config, null, 0)}</script>`;
    const indexFileContent = buildIndexFile(configContent, template);

    if (indexFileContent.search(configContent) < 0) {
        console.log('Index file content:', indexFileContent);
        throw new Error('Failed in generating Index file');
    }

    const zipFileContent = await createZipFileContent(objectKey, indexFileContent);

    // Upload the zip file to S3 using the v3 SDK
    const putObjectCommand = new PutObjectCommand({
        Bucket: s3BucketName,
        Key: objectKey,
        Body: zipFileContent,
    });

    await s3.send(putObjectCommand);

    return {
        PhysicalResourceId: objectKey,
    };
};

const deleteConfig = async (configKeyToDelete: string, s3BucketName: string) => {
    try {
        // Delete the object from S3 using the v3 SDK
        const deleteObjectCommand = new DeleteObjectCommand({
            Bucket: s3BucketName,
            Key: configKeyToDelete,
        });

        await s3.send(deleteObjectCommand);
    } catch (e) {
        console.log('Error in deleting the old config object', e);
    }

    return {};
};

const dispatch = async (event: CustomResourceEvent, requestType: string) => {
    const props = event.ResourceProperties;
    const resourceId = event.PhysicalResourceId;
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
            throw new Error('Unsupported RequestType');
    }
};

export const handler = async (event: CustomResourceEvent) => {
    console.log('Event: \n' + JSON.stringify(event, null, 2));
    try {
        const requestType = event.RequestType;
        const data = await dispatch(event, requestType);
        console.log('Response', data);
        return data;
    } catch (e) {
        console.log('Error', e);
        throw e;
    }
};
