// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';

export type CodePipelineConstructPropsBase = {
    readonly projectName: string;
} & (CodePipelineConstructPropsGithubSource | CodePipelineConstructPropsCodeCommitSource);

export type CodePipelineConstructProps = {
    readonly dataManifestBucket: s3.Bucket;
    readonly sageMakerArtifactBucket: s3.Bucket;
    readonly sageMakerExecutionRole: iam.Role;
} & CodePipelineConstructPropsBase;

export interface CodePipelineConstructPropsCodeCommitSource {
    readonly repoType: 'codecommit';
}

export interface CodePipelineConstructPropsGithubSource {
    readonly repoType: 'git';
    readonly git: {
        readonly githubConnectionArn: string;
        readonly githubRepoOwner: string;
        readonly githubRepoName: string;
        readonly githubRepoBranch?: string;
    };
}

/**
 * The CDK Construct provisions the code pipeline construct.
 */
export class CodePipelineConstruct extends Construct {
    readonly pipeline: codepipeline.Pipeline;
    constructor(scope: Construct, id: string, props: CodePipelineConstructProps) {
        super(scope, id);

        this.pipeline = new codepipeline.Pipeline(this, 'MLOpsPipeline', {
            restartExecutionOnUpdate: true,
        });

        const sourceCodeOutput = new codepipeline.Artifact('SourceCodeOutput');
        const sourceDataOutput = new codepipeline.Artifact('SourceDataOutput');
        const buildOutput = new codepipeline.Artifact('BuildOutput');
        const pipelineOutput = new codepipeline.Artifact('PipelineOutput');

        let sourceCode: codepipeline_actions.Action;

        //Source Code
        if (props.repoType === 'git') {
            sourceCode = new codepipeline_actions.CodeStarConnectionsSourceAction({
                actionName: 'SourceCode',
                output: sourceCodeOutput,
                owner: props.git.githubRepoOwner,
                repo: props.git.githubRepoName,
                branch: props.git.githubRepoBranch || 'main',
                connectionArn: props.git.githubConnectionArn,
            });
        } else {
            const sourceRepo = new codecommit.Repository(this, 'SourceRepository', {
                repositoryName: 'MLOpsE2EDemo',
            });
            sourceCode = new codepipeline_actions.CodeCommitSourceAction({
                actionName: 'SourceCode',
                output: sourceCodeOutput,
                repository: sourceRepo,
                branch: 'main',
            });
        }

        //Source Data
        const sourceData = new codepipeline_actions.S3SourceAction({
            actionName: 'SourceData',
            output: sourceDataOutput,
            bucket: props.dataManifestBucket,
            bucketKey: 'manifest.json.zip',
        });

        this.pipeline.addStage({
            stageName: 'Source',
            actions: [sourceCode, sourceData],
        });

        //CI
        const buildProject = new codebuild.PipelineProject(this, 'CIBuild', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/build.yml'),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
                privileged: true,
            },
        });

        const build = new codepipeline_actions.CodeBuildAction({
            actionName: 'CIBuild',
            project: buildProject,
            input: sourceCodeOutput,
            extraInputs: [sourceDataOutput],
            outputs: [buildOutput],
        });

        this.pipeline.addStage({
            stageName: 'CI',
            actions: [build],
        });

        //MLPipeline
        const mlPipelineRole = new iam.Role(this, 'MLPipelineRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        });

        mlPipelineRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['s3:CreateBucket', 's3:GetObject', 's3:PutObject', 's3:ListBucket'],
                Resource: [props.sageMakerArtifactBucket.bucketArn, `${props.sageMakerArtifactBucket.bucketArn}/*`],
            })
        );

        mlPipelineRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: [
                    'sagemaker:CreatePipeline',
                    'sagemaker:ListTags',
                    'sagemaker:AddTags',
                    'sagemaker:UpdatePipeline',
                    'sagemaker:DescribePipeline',
                    'sagemaker:StartPipelineExecution',
                    'sagemaker:DescribePipelineExecution',
                    'sagemaker:ListPipelineExecutionSteps',
                ],
                Resource: [
                    `arn:aws:sagemaker:${Stack.of(this).region}:${Stack.of(this).account}:pipeline/${
                        props.projectName
                    }`,
                    `arn:aws:sagemaker:${Stack.of(this).region}:${Stack.of(this).account}:pipeline/${
                        props.projectName
                    }/*`,
                ],
            })
        );

        mlPipelineRole.addToPolicy(
            iam.PolicyStatement.fromJson({
                Effect: 'Allow',
                Action: ['iam:PassRole'],
                Resource: [props.sageMakerExecutionRole.roleArn],
            })
        );

        const mlPipelineProject = new codebuild.PipelineProject(this, 'MLPipeline', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/pipeline.yml'),
            role: mlPipelineRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
            },
        });

        const mlPipelie = new codepipeline_actions.CodeBuildAction({
            actionName: 'MLPipeline',
            project: mlPipelineProject,
            input: buildOutput,
            outputs: [pipelineOutput],
            environmentVariables: {
                SAGEMAKER_ARTIFACT_BUCKET: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: props.sageMakerArtifactBucket.bucketName,
                },
                SAGEMAKER_PIPELINE_ROLE_ARN: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: props.sageMakerExecutionRole.roleArn,
                },
                SAGEMAKER_PROJECT_NAME: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: props.projectName,
                },
                PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: 'python',
                },
            },
        });

        this.pipeline.addStage({
            stageName: 'MLPipeline',
            actions: [mlPipelie],
        });

        //Deploy
        const deploymentApprovalTopic = new sns.Topic(this, 'ModelDeploymentApprovalTopic', {
            topicName: 'ModelDeploymentApprovalTopic',
        });

        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approval',
            runOrder: 1,
            notificationTopic: deploymentApprovalTopic,
            additionalInformation: `A new version of the model for project ${props.projectName} is waiting for approval`,
            externalEntityLink: `https://${Stack.of(this).region}.console.aws.amazon.com/sagemaker/home?region=${
                Stack.of(this).region
            }#/studio/`,
        });

        const deployRole = new iam.Role(this, 'DeployRole', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
        });

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                conditions: {
                    'ForAnyValue:StringEquals': {
                        'aws:CalledVia': ['cloudformation.amazonaws.com'],
                    },
                },
                actions: ['lambda:*Function*'],
                resources: [
                    `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:Deployment-${
                        props.projectName
                    }*`,
                ],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                conditions: {
                    'ForAnyValue:StringEquals': {
                        'aws:CalledVia': ['cloudformation.amazonaws.com'],
                    },
                },
                actions: ['sagemaker:*Endpoint*'],
                resources: ['*'],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                conditions: {
                    'ForAnyValue:StringEquals': {
                        'aws:CalledVia': ['cloudformation.amazonaws.com'],
                    },
                },
                actions: ['iam:*Role', 'iam:*Policy*', 'iam:*RolePolicy'],
                resources: [`arn:aws:iam::${Stack.of(this).account}:role/Deployment-${props.projectName}-*`],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    'cloudformation:DescribeStacks',
                    'cloudformation:CreateChangeSet',
                    'cloudformation:DescribeChangeSet',
                    'cloudformation:ExecuteChangeSet',
                    'cloudformation:DescribeStackEvents',
                    'cloudformation:DeleteChangeSet',
                    'cloudformation:GetTemplate',
                ],
                resources: [
                    `arn:aws:cloudformation:${Stack.of(this).region}:${Stack.of(this).account}:stack/CDKToolkit/*`,
                    `arn:aws:cloudformation:${Stack.of(this).region}:${Stack.of(this).account}:stack/Deployment-${
                        props.projectName
                    }/*`,
                ],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['s3:*Object', 's3:ListBucket', 's3:GetBucketLocation'],
                resources: ['arn:aws:s3:::cdktoolkit-stagingbucket-*'],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['ssm:GetParameter'],
                resources: [`arn:aws:ssm:${Stack.of(this).region}:${Stack.of(this).account}:parameter/cdk-bootstrap/*`],
            })
        );

        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ['sts:AssumeRole', 'iam:PassRole'],
                resources: [`arn:aws:iam::${Stack.of(this).account}:role/cdk*`],
            })
        );

        const deployProject = new codebuild.PipelineProject(this, 'DeployProject', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/deploy.yml'),
            role: deployRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_6_0,
                privileged: true,
            },
        });

        const deploy = new codepipeline_actions.CodeBuildAction({
            actionName: 'Deploy',
            runOrder: 2,
            project: deployProject,
            input: buildOutput,
            extraInputs: [pipelineOutput],
        });

        this.pipeline.addStage({
            stageName: 'Deploy',
            actions: [manualApprovalAction, deploy],
        });
    }
}
