// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as path from 'path';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3Notification from 'aws-cdk-lib/aws-s3-notifications';
import * as snsSubscription from 'aws-cdk-lib/aws-sns-subscriptions';

/**
 * The CDK Construct provisions the data source buckets and related resources.
 */
export class DataSourceConstruct extends Construct {
    readonly dataBucket: s3.Bucket;
    readonly dataManifestBucket: s3.Bucket;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const dataSourceMonitorFunctionRole = new iam.Role(this, 'DataFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        this.dataBucket = new s3.Bucket(this, 'DataBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            publicReadAccess: false,
        });

        this.dataBucket.grantRead(dataSourceMonitorFunctionRole);

        this.dataManifestBucket = new s3.Bucket(this, 'DataManifestBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            versioned: true,
            publicReadAccess: false,
        });

        this.dataManifestBucket.grantWrite(dataSourceMonitorFunctionRole);

        const newDataTopic = new sns.Topic(this, 'NewDataTopic');

        this.dataBucket.addObjectCreatedNotification(new s3Notification.SnsDestination(newDataTopic));

        const dataMonitorFunction = new lambdaNodeJs.NodejsFunction(this, 'DataSourceMonitorFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../functions/dataSourceMonitor/src/index.ts'),
            timeout: Duration.minutes(1),
            role: dataSourceMonitorFunctionRole,
            environment: {
                DATA_MANIFEST_BUCKET_NAME: this.dataManifestBucket.bucketName,
            },
        });

        newDataTopic.addSubscription(new snsSubscription.LambdaSubscription(dataMonitorFunction));
    }
}
