// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import archiver = require('archiver');

AWS.config.update({ region: process.env.AWS_REGION });

const s3 = new AWS.S3();

const s3BucketName = process.env.DATA_MANIFEST_BUCKET_NAME || '';

interface LambdaEvent {
    Records?: {
        Sns: {
            Message: string;
        };
    }[];
}

interface LambdaContext {
    awsRequestId: string;
}

const buildMainfestFileContent = (records: []): string => {
    const dataFileList = records
        .map(
            (r: {
                s3?: {
                    bucket: {
                        name: string;
                    };
                    object: {
                        key: string;
                    };
                };
            }) => {
                const s3 = r.s3;
                if (s3) {
                    return {
                        bucketName: s3.bucket.name,
                        objectKey: s3.object.key,
                    };
                }

                return null;
            }
        )
        .filter((d) => !!d);

    return JSON.stringify({
        data: dataFileList,
    });
};

const createZipFileContent = async (objectKey: string, fileContent: string) => {
    const filePath = `/tmp/${objectKey}`;
    const output = fs.createWriteStream(filePath);

    const closed = new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
    });

    const archiveHandler = archiver('zip');

    archiveHandler.pipe(output);

    archiveHandler.append(fileContent, { name: 'manifest.json' });

    archiveHandler.finalize();
    await closed;

    return fs.readFileSync(filePath);
};

const uploadToS3 = async (zipFileContent: Buffer) => {
    return s3
        .putObject({
            Bucket: s3BucketName,
            Key: 'manifest.json.zip',
            Body: zipFileContent,
        })
        .promise();
};

exports.handler = async (event: LambdaEvent, content: LambdaContext) => {
    console.log('Event: \n' + JSON.stringify(event, null, 2));
    try {
        if (event.Records && event.Records.length > 0) {
            const message = JSON.parse(event.Records[0].Sns.Message);
            const records = message.Records;
            if (records && records.length > 0) {
                console.log('Updating the data manifest file');
                const fileContent = buildMainfestFileContent(records);
                const zipFileContent = await createZipFileContent(content.awsRequestId, fileContent);
                await uploadToS3(zipFileContent);
            }
        }
    } catch (e) {
        console.log('Error', e);
        throw e;
    }
};
