# Online Consumer of ML Inference Model

This folder includes an example how to consume the ML Inference Model via the SageMaker Hosting Endpoint. The solution is developed in Typescript.

## Solution Structure

The `infrastructure` folder includes the infrastructure code for provisioning the backend API for serving the inference requests from user input and user feedback requests, as well as website hosting for hosting the ui. 

The `website` folder includes the code of a Single Page App (SPA) for getting user input, displaying inference result, and getting user feedback. 

## Usage

### Bootstrap

Run the command below to provision all the required infrastructure.

```
bootstrap.sh
```

The command can be run repatedly to deploy any changes in this folder. 

### Cleanup

To clean up all the infrastructure, run the command below:

```
cleanup.sh
```

