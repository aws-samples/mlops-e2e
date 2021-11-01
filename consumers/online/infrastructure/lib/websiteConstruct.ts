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
import * as fs from 'fs';
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodeJs from '@aws-cdk/aws-lambda-nodejs';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as customResource from '@aws-cdk/custom-resources';
import * as logs from '@aws-cdk/aws-logs';
import * as apigateway from '@aws-cdk/aws-apigateway';

export interface WebsiteConstructProps {
    readonly websiteDistPath: string;
    readonly api: apigateway.RestApi;
}

/**
 * The CDK Construct provisions the resources for hosting the static website,
 * including a S3 Website bucket, a CloudFront distribution,
 * a custom resource injecting the config (e.g., API Url) into index.html file,
 * a S3 bucket deployment deploying the website static files.
 */
export class WebsiteConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: WebsiteConstructProps) {
        super(scope, id);

        const cloudFrontOia = new cloudfront.CfnCloudFrontOriginAccessIdentity(this, 'OIA', {
            cloudFrontOriginAccessIdentityConfig: {
                comment: 'OIA for website.',
            },
        });

        const originAccessIdentity = cloudfront.OriginAccessIdentity.fromOriginAccessIdentityName(
            this,
            'OriginAccessIdentity',
            cloudFrontOia.ref
        );

        const accessLoggingBucket = new s3.Bucket(this, 'WebsiteBucketAccessLogging', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: 'logs',
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        });

        const sourceBucket = new s3.Bucket(this, 'WebsiteBucket', {
            websiteIndexDocument: 'index.html',
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            serverAccessLogsPrefix: 'logs',
            serverAccessLogsBucket: accessLoggingBucket,
            encryption: s3.BucketEncryption.S3_MANAGED,
        });

        const cloudFrontLoggingBucket = new s3.Bucket(this, 'S3BucketForWebsiteLogging', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: 'logs',
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        });

        const cloudFrontDistribution = new cloudfront.CloudFrontWebDistribution(this, 'WebsiteCloudFront', {
            priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
            defaultRootObject: 'index.html',
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            loggingConfig: {
                bucket: cloudFrontLoggingBucket,
            },
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: sourceBucket,
                        originAccessIdentity,
                    },
                    behaviors: [{ isDefaultBehavior: true }],
                },
            ],
            errorConfigurations: [
                {
                    errorCode: 404,
                    responseCode: 200,
                    responsePagePath: `/index.html`,
                    errorCachingMinTtl: 0,
                },
            ],
        });

        /**S3 bucket storing the dynamically generated index files.*/
        const websiteIndexBucket = new s3.Bucket(this, 'WebsiteIndexBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            serverAccessLogsPrefix: 'logs',
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        });

        const buildWebsiteIndexFunction = new lambdaNodeJs.NodejsFunction(this, 'BuildWebsiteIndexFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'handler',
            entry: path.join(__dirname, '../customResources/websiteIndex/index.ts'),
            timeout: cdk.Duration.minutes(1),
            reservedConcurrentExecutions: 1,
        });

        websiteIndexBucket.grantReadWrite(buildWebsiteIndexFunction);

        const buildWebsiteIndexCustomResourceProvider = new customResource.Provider(
            this,
            'BuildWebsiteIndexCustomResourceProvider',
            {
                onEventHandler: buildWebsiteIndexFunction,
                logRetention: logs.RetentionDays.ONE_DAY,
            }
        );

        const indexFile = fs.readFileSync(path.join(props.websiteDistPath, 'index.html'), 'utf8');

        const buildWebsiteIndexCustomResource = new cdk.CustomResource(this, 'BuildWebsiteIndexCustomResource', {
            serviceToken: buildWebsiteIndexCustomResourceProvider.serviceToken,
            properties: {
                s3BucketName: websiteIndexBucket.bucketName,
                template: indexFile,
                apiUrl: props.api.url,
            },
        });

        buildWebsiteIndexCustomResource.node.addDependency(websiteIndexBucket, props.api);

        const cachedDeployment = new s3Deployment.BucketDeployment(this, 'CachedDeployWebsite', {
            sources: [
                s3Deployment.Source.asset(props.websiteDistPath, {
                    exclude: ['index.html', 'config.js', 'config.*.js'],
                }),
            ],
            prune: false,
            destinationBucket: sourceBucket,
            distribution: cloudFrontDistribution,
        });

        const uncachedDeployment = new s3Deployment.BucketDeployment(this, 'UncachedDeployWebsite', {
            sources: [s3Deployment.Source.bucket(websiteIndexBucket, buildWebsiteIndexCustomResource.ref)],
            destinationBucket: sourceBucket,
            prune: false,
            distribution: cloudFrontDistribution,
            cacheControl: [s3Deployment.CacheControl.noCache()],
        });

        uncachedDeployment.node.addDependency(cachedDeployment, buildWebsiteIndexCustomResource);

        new cdk.CfnOutput(this, 'ModelConsumerOnlineWebsiteCloudfrontDistributionId', {
            value: cloudFrontDistribution.distributionId,
            exportName: `ModelConsumerOnlineWebsiteCloudfrontDistributionId`,
        });

        new cdk.CfnOutput(this, 'ModelConsumerOnlineCloudfrontDistributionDomainName', {
            value: cloudFrontDistribution.distributionDomainName,
            exportName: `ModelConsumerOnlineWebsiteCloudfrontDistributionDomainName`,
        });
    }
}
