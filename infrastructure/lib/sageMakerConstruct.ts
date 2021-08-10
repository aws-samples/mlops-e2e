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
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam';

export interface SageMakerConstructProps {
    readonly dataBucket: s3.Bucket;
}

/**
 * The CDK Construct provisions the sagemaker execution related resources.
 */
export class SageMakerConstruct extends cdk.Construct {
    readonly sagemakerExecutionRole: iam.Role;
    readonly sagemakerArtifectBucket: s3.Bucket;
    constructor(scope: cdk.Construct, id: string, props: SageMakerConstructProps) {
        super(scope, id);

        this.sagemakerArtifectBucket = new s3.Bucket(this, 'SageMakerArtifectBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: 'logs',
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        });

        this.sagemakerExecutionRole = new iam.Role(this, 'SageMakerExecutionRole', {
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')],
        });

        this.sagemakerExecutionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:ListBucket'],
                Resource: [props.dataBucket.bucketArn, `${props.dataBucket.bucketArn}/*`],
            })
        );

        this.sagemakerExecutionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
                Resource: [this.sagemakerArtifectBucket.bucketArn, `${this.sagemakerArtifectBucket.bucketArn}/*`],
            })
        );
    }
}
