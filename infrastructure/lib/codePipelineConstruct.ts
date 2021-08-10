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
import * as sns from '@aws-cdk/aws-sns';
import * as codecommit from '@aws-cdk/aws-codecommit';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';

export type CodePipelineConstructProps = {
    readonly dataManifestBucket: s3.Bucket;
    readonly sageMakerArtifectBucket: s3.Bucket;
    readonly sageMakerExecutionRole: iam.Role;
    readonly projectName: string;
} & (CodePipelineConstructPropsGithubSource | CodePipelineConstructPropsCodeCommitSource);

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
export class CodePipelineConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: CodePipelineConstructProps) {
        super(scope, id);

        const pipeline = new codepipeline.Pipeline(this, 'MLOpsPipeline', {
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

        pipeline.addStage({
            stageName: 'Source',
            actions: [sourceCode, sourceData],
        });

        //CI
        const buildProject = new codebuild.PipelineProject(this, 'CIBuild', {
            buildSpec: codebuild.BuildSpec.fromSourceFilename('./buildspecs/build.yml'),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const build = new codepipeline_actions.CodeBuildAction({
            actionName: 'CIBuild',
            project: buildProject,
            input: sourceCodeOutput,
            extraInputs: [sourceDataOutput],
            outputs: [buildOutput],
        });

        pipeline.addStage({
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
                Resource: [props.sageMakerArtifectBucket.bucketArn, `${props.sageMakerArtifectBucket.bucketArn}/*`],
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
                    `arn:aws:sagemaker:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:pipeline/${
                        props.projectName
                    }`,
                    `arn:aws:sagemaker:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:pipeline/${
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
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
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
                    value: props.sageMakerArtifectBucket.bucketName,
                },
                SAGEMAKER_PIPELINE_ROLE_ARN: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: props.sageMakerExecutionRole.roleArn,
                },
                SAGEMAKER_PROJECT_NAME: {
                    type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                    value: props.projectName,
                },
            },
        });

        pipeline.addStage({
            stageName: 'MLPipeline',
            actions: [mlPipelie],
        });

        //Deploy
        const stackName = `Deployment-${props.projectName}`;
        const changeSetName = `Deployment-ChangeSet-${props.projectName}`;

        const deploymentApprovalTopic = new sns.Topic(this, 'ModelDeploymentApprovalTopic', {
            topicName: 'ModelDeploymentApprovalTopic',
        });

        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approval',
            runOrder: 1,
            notificationTopic: deploymentApprovalTopic,
            additionalInformation: `A new version of the model for project ${props.projectName} is waiting for approval`,
            externalEntityLink: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/sagemaker/home?region=${
                cdk.Stack.of(this).region
            }#/studio/`,
        });

        const prepare = new codepipeline_actions.CloudFormationCreateReplaceChangeSetAction({
            actionName: 'Prepare',
            runOrder: 2,
            stackName,
            changeSetName,
            adminPermissions: true,
            templatePath: buildOutput.atPath('model_deploy/cdk.out/ModelDeploymentStack.template.json'),
            extraInputs: [pipelineOutput],
            parameterOverrides: {
                modelPackageName: { 'Fn::GetParam': [pipelineOutput.artifactName, 'pipelineExecution.json', 'arn'] },
            },
        });

        const execution = new codepipeline_actions.CloudFormationExecuteChangeSetAction({
            actionName: 'Execute',
            runOrder: 3,
            stackName,
            changeSetName,
        });

        pipeline.addStage({
            stageName: 'Deploy',
            actions: [manualApprovalAction, prepare, execution],
        });
    }
}
