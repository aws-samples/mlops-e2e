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

const s3BucketName = process.env.DATA_MANIFEST_BUCKET_NAME || '';

const buildMainfestFileContent = (records: []): string => {
    const dataFileList = records
        .map((r: any) => {
            const s3 = r.s3;
            if (s3) {
                return {
                    bucketName: s3.bucket.name,
                    objectKey: s3.object.key,
                };
            }

            return null;
        })
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

exports.handler = async (event: any, content: any) => {
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
