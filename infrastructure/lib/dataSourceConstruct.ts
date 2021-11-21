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
import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';
import * as sns from '@aws-cdk/aws-sns';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJs from '@aws-cdk/aws-lambda-nodejs';
import * as s3Notification from '@aws-cdk/aws-s3-notifications';
import * as snsSubscription from '@aws-cdk/aws-sns-subscriptions';

/**
 * The CDK Construct provisions the data source buckets and related resources.
 */
export class DataSourceConstruct extends cdk.Construct {
    readonly dataBucket: s3.Bucket;
    readonly dataManifestBucket: s3.Bucket;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        const dataSourceMonitorFunctionRole = new iam.Role(this, 'DataFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        this.dataBucket = new s3.Bucket(this, 'DataBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        this.dataBucket.grantRead(dataSourceMonitorFunctionRole);

        this.dataManifestBucket = new s3.Bucket(this, 'DataManifestBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
        });

        this.dataManifestBucket.grantWrite(dataSourceMonitorFunctionRole);

        const newDataTopic = new sns.Topic(this, 'NewDataTopic');

        this.dataBucket.addObjectCreatedNotification(new s3Notification.SnsDestination(newDataTopic));

        const dataMonitorFunction = new lambdaNodeJs.NodejsFunction(this, 'DataSourceMonitorFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../functions/dataSourceMonitor/index.ts'),
            timeout: cdk.Duration.minutes(1),
            role: dataSourceMonitorFunctionRole,
            reservedConcurrentExecutions: 1,
            environment: {
                DATA_MANIFEST_BUCKET_NAME: this.dataManifestBucket.bucketName,
            },
        });

        newDataTopic.addSubscription(new snsSubscription.LambdaSubscription(dataMonitorFunction));
    }
}
