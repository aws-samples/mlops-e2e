// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Duration, Token } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodeJs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';

export interface WebsiteApiConstructProps {
    readonly ipCIDRBlocks: string[];
    readonly sageMakeEndpointARN: string;
    readonly sageMakerEndpointName: string;
}

/**
 * The CDK Construct provisions the backend api resources.
 */
export class WebsiteApiConstruct extends Construct {
    readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: WebsiteApiConstructProps) {
        super(scope, id);

        const dataTable = new dynamodb.Table(this, 'DataTable', {
            partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.DEFAULT,
            pointInTimeRecovery: true,
        });

        const apigatewayPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['execute-api:Invoke'],
                    resources: ['execute-api:/*/*/*'],
                    principals: [new iam.AnyPrincipal()],
                }),
                new iam.PolicyStatement({
                    effect: iam.Effect.DENY,
                    actions: ['execute-api:Invoke'],
                    resources: ['execute-api:/*/*/*'],
                    principals: [new iam.AnyPrincipal()],
                    conditions: {
                        NotIpAddress: {
                            'aws:SourceIp': props.ipCIDRBlocks,
                        },
                    },
                }),
            ],
        });

        this.api = new apigateway.RestApi(this, 'DataAPI', {
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            },
            policy: apigatewayPolicy,
            restApiName: 'Data API',
        });

        this.api.latestDeployment?.addToLogicalId(Token.asAny(apigatewayPolicy));

        this.api.addUsagePlan('WebsiteDataAPIUsagePlan', {
            name: 'WebsiteDataAPIUsagePlan',
            apiStages: [{ api: this.api, stage: this.api.deploymentStage }],
            throttle: { burstLimit: 500, rateLimit: 1000 },
            quota: { limit: 10000000, period: apigateway.Period.MONTH },
        });

        const dataFunctionRole = new iam.Role(this, 'DataFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        });

        dataFunctionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:GetItem'],
                Resource: [dataTable.tableArn],
            })
        );

        dataFunctionRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['sagemaker:InvokeEndpoint'],
                Resource: [props.sageMakeEndpointARN],
            })
        );

        const dataFunction = new lambdaNodeJs.NodejsFunction(this, 'DataFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../../data-api/src/index.ts'),
            timeout: Duration.seconds(30),
            role: dataFunctionRole,
            environment: {
                SAGEMAKER_ENDPOINT_NAME: props.sageMakerEndpointName,
                DATA_TABLE_NAME: dataTable.tableName,
            },
        });

        const dataIntegration = new apigateway.LambdaIntegration(dataFunction);

        const dataEndpoint = this.api.root.addResource('data');
        dataEndpoint.addMethod('POST', dataIntegration);

        const dataFeedbackEndpoint = dataEndpoint.addResource('{id}');
        dataFeedbackEndpoint.addMethod('POST', dataIntegration);
    }
}
