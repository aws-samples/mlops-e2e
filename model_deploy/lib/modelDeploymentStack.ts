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
import * as path from 'path';
import * as iam from '@aws-cdk/aws-iam';
import * as sagemaker from '@aws-cdk/aws-sagemaker';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJs from '@aws-cdk/aws-lambda-nodejs';
import * as customResource from '@aws-cdk/custom-resources';
import * as logs from '@aws-cdk/aws-logs';

export interface ModelDeploymentStackProps extends cdk.StackProps {
    modelEndpointExportNamePrefix: string;
    projectName: string;
}

export class ModelDeploymentStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: ModelDeploymentStackProps) {
        super(scope, id, props);

        const modelPackageName = new cdk.CfnParameter(this, 'modelPackageName', {
            type: 'String',
        });

        const endpointInstanceType = new cdk.CfnParameter(this, 'endpointInstanceType', {
            type: 'String',
            default: 'ml.m5.large',
        });

        const endpointInstanceCount = new cdk.CfnParameter(this, 'endpointInstanceCount', {
            type: 'Number',
            default: 1,
            minValue: 1,
        });

        const executionRole = new iam.Role(this, 'SageMakerModelExecutionRole', {
            assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess')],
        });

        const pipelineModelFunctionRole = new iam.Role(this, 'DataFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        pipelineModelFunctionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['sagemaker:CreateModel', 'sagemaker:DeleteModel', 'sagemaker:DescribeModelPackage'],
                Resource: [
                    `arn:aws:sagemaker:${this.region}:${this.account}:model/${props.projectName}*`,
                    modelPackageName.valueAsString
                ],
            })
        );

        pipelineModelFunctionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['iam:PassRole'],
                Resource: [executionRole.roleArn],
            }));

        const pipelineModelFunction = new lambdaNodeJs.NodejsFunction(this, 'PipelineModelFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../customResources/pipelineModel/index.ts'),
            timeout: cdk.Duration.minutes(1),
            reservedConcurrentExecutions: 1,
            role: pipelineModelFunctionRole
        });

        const pipelineModelCustomResourceProvider = new customResource.Provider(
            this,
            'PipelineModelCustomResourceProvider',
            {
                onEventHandler: pipelineModelFunction,
                logRetention: logs.RetentionDays.ONE_DAY,
            }
        );

        const pipelineModelCustomResource = new cdk.CustomResource(this, 'PipelineModelCustomResource', {
            serviceToken: pipelineModelCustomResourceProvider.serviceToken,
            properties: {
                modelPackageName: modelPackageName.valueAsString,
                sagemakerExecutionRole: executionRole.roleArn,
                projectName: props.projectName
            },
        });

        pipelineModelCustomResource.node.addDependency(executionRole);

        const endpointConfig = new sagemaker.CfnEndpointConfig(this, 'SageMakerModelEndpointConfig', {
            productionVariants: [
                {
                    initialInstanceCount: endpointInstanceCount.valueAsNumber,
                    initialVariantWeight: 1.0,
                    instanceType: endpointInstanceType.valueAsString,
                    modelName: pipelineModelCustomResource.ref,
                    variantName: 'AllTraffic',
                },
            ],
        });

        endpointConfig.node.addDependency(pipelineModelCustomResource)

        const endpoint = new sagemaker.CfnEndpoint(this, 'SageMakerModelEndpoint', {
            endpointConfigName: endpointConfig.getAtt('EndpointConfigName').toString(),
        });

        endpoint.node.addDependency(endpointConfig);

        new cdk.CfnOutput(this, 'ModelEndpointOutput', {
            value: endpoint.ref,
            exportName: `${props.modelEndpointExportNamePrefix}-${props.projectName}`,
        });

        new cdk.CfnOutput(this, 'ModelEndpointNameOutput', {
            value: endpoint.getAtt('EndpointName').toString(),
            exportName: `${props.modelEndpointExportNamePrefix}-Name-${props.projectName}`,
        });
    }
}
