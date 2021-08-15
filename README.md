# MLOps End-to-End Example using Amazon SageMaker Pipeline, AWS CodePipeline and AWS CDK

This sample project uses a sample machine learning project to showcase how we can implement MLOps - CI/CD for Machine Learning using [Amazon SageMaker](https://aws.amazon.com/sagemaker/), [AWS CodePipeline](https://aws.amazon.com/codepipeline/) and [AWS CDK](https://aws.amazon.com/cdk/)

## Pre-requisite

- [Python](https://www.python.org/) (version 3.8 or higher)
- [NodeJS](https://nodejs.org/en/) (version 14 or higher)
- [Yarn](https://yarnpkg.com/) (installed via `npm install -g yarn`)
- [Typescript](https://www.typescriptlang.org/) (installed via `npm install -g typescript`)
- [AWS CDK](https://aws.amazon.com/cdk/) CLI (installed via `npm install -g aws-cdk`)
- [AWS CLI](https://aws.amazon.com/cli/) (version 2 or higher)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) (configured via `aws configure`)

## Configuration

### Source Repo

#### Option 1: Use GitHub Repo

1. Fork this repo in your GitHub account
1. [Create a GitHub connection using the CodePipeline console](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html) to provide CodePipeline with access to your Github repositories _(See session Create a connection to GitHub (CLI))_
1. Update the GitHub related configuration in the `./configuration/projectConfig.json` file
   - Set the value of _repoType_ to _git_
   - Update the value of _githubConnectionArn_, _githubRepoOwner_ and _githubRepoName_

#### Option 2: Create a CodeCommit Repo in your AWS account

Alternatively, the CDK Infrastructure code can provision a CodeCommit Repo as Source Repo for you.

To switch to this option, set the value of _repoType_ to _codecommit_ in the `./configuration/projectConfig.json` file.

## Usage

**Important**: this application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the AWS Pricing page for details. You are responsible for any AWS costs incurred. No warranty is implied in this example.

### Bootstrap

Run the command below to provision all the required infrastructure.

```
bootstrap.sh
```

The command can be run repatedly to deploy any changes in this folder.

#### Source Code

If **repoType** is _codecommit_, after the cloudformation stack is created, follow [this page to connect to the CodeCommit Repo](https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-connect.html) and push the content of this folder to the **main** branch of the repo.

**Note**: The default branch may not be **main** depending on your Git setting.

#### Testing Data Set

Download a copy of testing data set from `https://archive.ics.uci.edu/ml/datasets/abalone`, and upload it to the Data Source S3 Bucket (The bucket name starts with _mlopsinfrastracturestack-datasourcedatabucket..._) under your prefered folder path, e.g. _yyyy/mm/dd/abalone.csv_.

### Cleanup

To clean up all the infrastructure, run the command below:

```
cleanup.sh
```

## Sample Machine Learning Project

The project is created based on the [SageMaker Project Template - MLOps template for model building, training and deployment](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-projects-templates-sm.html#sagemaker-projects-templates-code-commit).

In this example, we are solving the abalone age prediction problem using a sample dataset. The dataset used is the [UCI Machine Learning Abalone Dataset](https://archive.ics.uci.edu/ml/datasets/abalone). The aim for this task is to determine the age of an abalone (a kind of shellfish) from its physical measurements. At the core, it's a regression problem.

## Project Layout

- `buildspecs`: Build specification files used by CodeBuild projects
- `configuration`: Project and Pipeline configuration
- `docs`: Images used in the documentation
- `infrastructure`: [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) app for provisioning the end-to-end MLOps infrastructure
- `ml_pipeline`: The SageMaker pipeline definition expressing the ML steps involved in generating an ML model and helper scripts
- `model_deploy`: [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html) app for deploying the model on SageMaker endpoint
- `scripts`: Bash scripts used in the CI/CD pipeline
- `src`: Machine learning code for peprocessing and evaluating the ML model
- `tests`: Unit testing code for testing machine learning code

## Overall Architecture

The overall archiecture of the sample project is shown below:

![Overall Archiecture](./docs/MLOpsOverallArchitecture.png)

## License

This project is licensed under the [MIT](./LISENSE).

## Contributing
Refer to [CONTRIBUTING](./CONTRIBUTING) for more details on how to contribute to this project. 
