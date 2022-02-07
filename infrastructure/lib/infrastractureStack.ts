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
import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CodePipelineConstruct, CodePipelineConstructProps } from './codePipelineConstruct';
import { DataSourceConstruct } from './dataSourceConstruct';
import { SageMakerConstruct } from './sageMakerConstruct';

export type InfrastractureStackProps = CodePipelineConstructProps & StackProps;

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
