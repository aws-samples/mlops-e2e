// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface SageMakerConstructProps {
    readonly dataBucket: s3.Bucket;
}

/**
 * The CDK Construct provisions the sagemaker execution related resources.
 */
export class SageMakerConstruct extends Construct {
    readonly sagemakerExecutionRole: iam.Role;
    readonly sagemakerArtifactBucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: SageMakerConstructProps) {
        super(scope, id);

        this.sagemakerArtifactBucket = new s3.Bucket(this, 'SageMakerArtifactBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
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
                Resource: [this.sagemakerArtifactBucket.bucketArn, `${this.sagemakerArtifactBucket.bucketArn}/*`],
            })
        );
    }
}
