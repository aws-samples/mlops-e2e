// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Stack, StackProps, CfnParameter, CustomResource, CfnOutput, Duration } from 'aws-cdk-lib';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as customResource from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface ModelDeploymentStackProps extends StackProps {
    modelEndpointExportNamePrefix: string;
    projectName: string;
}

export class ModelDeploymentStack extends Stack {
    constructor(scope: Construct, id: string, props: ModelDeploymentStackProps) {
        super(scope, id, props);

        const modelPackageName = new CfnParameter(this, 'modelPackageName', {
            type: 'String',
        });

        const endpointInstanceType = new CfnParameter(this, 'endpointInstanceType', {
            type: 'String',
            default: 'ml.m5.xlarge',
        });

        const endpointInstanceCount = new CfnParameter(this, 'endpointInstanceCount', {
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
                    modelPackageName.valueAsString,
                ],
            })
        );

        pipelineModelFunctionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['iam:PassRole'],
                Resource: [executionRole.roleArn],
            })
        );

        const pipelineModelFunction = new lambdaNodeJs.NodejsFunction(this, 'PipelineModelFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../customResources/pipelineModel/index.ts'),
            timeout: Duration.minutes(1),
            role: pipelineModelFunctionRole,
        });

        const pipelineModelCustomResourceProvider = new customResource.Provider(
            this,
            'PipelineModelCustomResourceProvider',
            {
                onEventHandler: pipelineModelFunction,
                logRetention: logs.RetentionDays.ONE_DAY,
            }
        );

        const pipelineModelCustomResource = new CustomResource(this, 'PipelineModelCustomResource', {
            serviceToken: pipelineModelCustomResourceProvider.serviceToken,
            properties: {
                modelPackageName: modelPackageName.valueAsString,
                sagemakerExecutionRole: executionRole.roleArn,
                projectName: props.projectName,
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

        endpointConfig.node.addDependency(pipelineModelCustomResource);

        const endpoint = new sagemaker.CfnEndpoint(this, 'SageMakerModelEndpoint', {
            endpointConfigName: endpointConfig.getAtt('EndpointConfigName').toString(),
        });

        endpoint.node.addDependency(endpointConfig);

        new CfnOutput(this, 'ModelEndpointOutput', {
            value: endpoint.ref,
            exportName: `${props.modelEndpointExportNamePrefix}-${props.projectName}`,
        });

        new CfnOutput(this, 'ModelEndpointNameOutput', {
            value: endpoint.getAtt('EndpointName').toString(),
            exportName: `${props.modelEndpointExportNamePrefix}-Name-${props.projectName}`,
        });
    }
}
