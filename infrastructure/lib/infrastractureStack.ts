// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipelineConstruct, CodePipelineConstructPropsBase } from './codePipelineConstruct';
import { DataSourceConstruct } from './dataSourceConstruct';
import { SageMakerConstruct } from './sageMakerConstruct';

export type InfrastractureStackProps = CodePipelineConstructPropsBase & StackProps;

export class InfrastractureStack extends Stack {
    constructor(scope: Construct, id: string, props: InfrastractureStackProps) {
        super(scope, id, props);

        const dataSource = new DataSourceConstruct(this, 'DataSource');

        const sageMaker = new SageMakerConstruct(this, 'SageMakerConstruct', {
            dataBucket: dataSource.dataBucket,
        });

        const codePipeline = new CodePipelineConstruct(this, 'CodePipeline', {
            ...props,
            dataManifestBucket: dataSource.dataManifestBucket,
            sageMakerArtifactBucket: sageMaker.sagemakerArtifactBucket,
            sageMakerExecutionRole: sageMaker.sagemakerExecutionRole,
        });

        new CfnOutput(this, 'CodePipelineOutput', {
            value: codePipeline.pipeline.pipelineName,
        });

        new CfnOutput(this, 'DataBucketOutput', {
            value: dataSource.dataBucket.bucketName,
            exportName: 'MLOpsE2EDemo-DataBucket',
        });

        new CfnOutput(this, 'DataManifestBucketOutput', {
            value: dataSource.dataManifestBucket.bucketName,
        });

        new CfnOutput(this, 'SageMakerArtifactBucketOutput', {
            value: sageMaker.sagemakerArtifactBucket.bucketName,
            exportName: 'MLOpsE2EDemo-SageMakerArtifactBucket',
        });

        new CfnOutput(this, 'SageMakerExecutionRoleOutput', {
            value: sageMaker.sagemakerExecutionRole.roleArn,
            exportName: 'MLOpsE2EDemo-SageMakerExecutionRole',
        });
    }
}
