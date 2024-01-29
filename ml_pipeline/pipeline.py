# Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the "Software"), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
# the Software, and to permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
# FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
# COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
# IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                                                              *

"""Example workflow pipeline script for abalone pipeline.

                                               . -RegisterModel
                                              .
    Process-> Train -> Evaluate -> Condition .
                                              .
                                               . -(stop)

Implements a get_pipeline(**kwargs) method.
"""
import os

import boto3
import sagemaker
import sagemaker.session

from sagemaker.sklearn.estimator import SKLearn
from sagemaker.inputs import TrainingInput
# from sagemaker.model_metrics import (
#     MetricsSource,
#     ModelMetrics,
# )
from sagemaker.processing import (
    ProcessingInput,
    ProcessingOutput,
)
from sagemaker.sklearn import SKLearnModel
from sagemaker.sklearn.processing import SKLearnProcessor
from sagemaker.workflow.functions import Join
from sagemaker.workflow.conditions import ConditionLessThanOrEqualTo
from sagemaker.workflow.condition_step import (
    ConditionStep,
    JsonGet,
)

from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.properties import PropertyFile
from sagemaker.workflow.steps import (
    ProcessingStep,
    TrainingStep
)
from sagemaker.pipeline import PipelineModel
from sagemaker.workflow.step_collections import RegisterModel

BASE_DIR = os.path.dirname(os.path.realpath(__file__))


def get_session(region, default_bucket):
    """Gets the sagemaker session based on the region.

    Args:
        region: the aws region to start the session
        default_bucket: the bucket to use for storing the artifacts

    Returns:
        `sagemaker.session.Session instance
    """

    boto_session = boto3.Session(region_name=region)

    sagemaker_client = boto_session.client("sagemaker")
    runtime_client = boto_session.client("sagemaker-runtime")
    return sagemaker.session.Session(
        boto_session=boto_session,
        sagemaker_client=sagemaker_client,
        sagemaker_runtime_client=runtime_client,
        default_bucket=default_bucket,
    )


def get_pipeline(
        region,
        role=None,
        default_bucket=None,
        model_package_group_name="AbaloneModelPackageGroup",
        pipeline_name="AbalonePipeline",
        base_job_prefix="Abalone",
):
    """Gets a SageMaker ML Pipeline instance working with on abalone data.

    Args:
        region: AWS region to create and run the pipeline.
        role: IAM role to create and run steps and pipeline.
        default_bucket: the bucket to use for storing the artifacts

    Returns:
        an instance of a pipeline
    """
    sagemaker_session = get_session(region, default_bucket)
    if role is None:
        role = sagemaker.session.get_execution_role(sagemaker_session)

    # # parameters for pipeline execution
    # processing_instance_count = ParameterInteger(name="ProcessingInstanceCount", default_value=1)
    # processing_instance_type = ParameterString(
    #     name="ProcessingInstanceType", default_value="ml.t3.large"
    # )
    # training_instance_type = ParameterString(
    #     name="TrainingInstanceType", default_value="ml.t3.large"
    # )
    # model_approval_status = ParameterString(
    #     name="ModelApprovalStatus", default_value="Approved"
    # )

    # processing step for feature engineering
    sklearn_processor = SKLearnProcessor(
        framework_version="1.2-1",
        instance_type="ml.t3.large",
        instance_count=1,
        base_job_name=f"{base_job_prefix}/sklearn-preprocess",
        sagemaker_session=sagemaker_session,
        role=role,
    )
    print("FINISH - SKPROCESSOR")
    f = open(os.path.join(BASE_DIR, "..", "dataManifest.json"))
    step_process = ProcessingStep(
        name="PreprocessData",
        processor=sklearn_processor,
        outputs=[
            ProcessingOutput(output_name="train", source="/opt/ml/processing/train"),
            ProcessingOutput(output_name="test", source="/opt/ml/processing/test"),
            ProcessingOutput(output_name="model", source="/opt/ml/processing/model"),
        ],
        code=os.path.join(BASE_DIR, "..", "src", "preprocess.py"),
        job_arguments=["--data-manifest", f.read()],
    )

    f.close()
    print("FINISH - PROCESSING STEP")

    # training step for generating model artifacts
    script_path = os.path.join(BASE_DIR, "..", "src", "train.py")
    FRAMEWORK_VERSION = "1.2-1"
    ridge_train = SKLearn(
        entry_point=script_path,
        framework_version=FRAMEWORK_VERSION,
        instance_type="ml.t3.large",
        role=role,
        sagemaker_session=sagemaker_session,
        output_path="s3://mlopsinfrastracturestack--sagemakerconstructsagema-b5kdwdejsosj/",
        hyperparameters={"alpha": 10}
    )
    print("FINISH - SKLEARN")

    step_train = TrainingStep(
        name="TrainModel",
        estimator=ridge_train,
        inputs={
            "train": TrainingInput(
                s3_data=step_process.properties.ProcessingOutputConfig.Outputs[
                    "train"
                ].S3Output.S3Uri,
                content_type="text/csv",
            )
        }
    )

    print("FINISH - TRAINING")

    # processing step for evaluation
    sklearn_processor = SKLearnProcessor(
        framework_version=FRAMEWORK_VERSION,
        role=role,
        instance_type="ml.t3.large",
        instance_count=1
    )

    print("FINISH - EVAL")

    evaluation_report = PropertyFile(
        name="EvaluationReport",
        output_name="evaluation",
        path="evaluation.json",
    )

    print("FINISH - EV-REPORT")

    step_eval = ProcessingStep(
        name="EvaluateModel",
        processor=sklearn_processor,
        inputs=[
            ProcessingInput(
                source=step_train.properties.ModelArtifacts.S3ModelArtifacts,
                destination="/opt/ml/processing/model",
            ),
            ProcessingInput(
                source=step_process.properties.ProcessingOutputConfig.Outputs[
                    "test"
                ].S3Output.S3Uri,
                destination="/opt/ml/processing/test",
            ),
        ],
        outputs=[
            ProcessingOutput(output_name="evaluation", source="/opt/ml/processing/evaluation"),
        ],
        code=os.path.join(BASE_DIR, "..", "src", "evaluate.py"),
        property_files=[evaluation_report],
    )
    print("FINISH - EV step")

    #
    # # register model step that will be conditionally executed
    # model_metrics = ModelMetrics(
    #     model_statistics=MetricsSource(
    #         s3_uri="{}/evaluation.json".format(
    #             step_eval.arguments["ProcessingOutputConfig"]["Outputs"][0]["S3Output"]["S3Uri"]
    #         ),
    #         content_type="application/json",
    #     )
    # )
    #
    # print("FINISH - METRICS")

    sklearn_model = SKLearnModel(
        name='SKLearnTransform',
        entry_point=os.path.join(BASE_DIR, "..", "src", "transform.py"),
        role=role,
        framework_version="1.2-1",
        py_version="py3",
        sagemaker_session=sagemaker_session,
        model_data=Join(on='/', values=[step_process.properties.ProcessingOutputConfig.Outputs[
                                            "model"
                                        ].S3Output.S3Uri, "model.tar.gz"]),
    )
    print("FINISH - SK MODEL")

    model = PipelineModel(
        name='PipelineModel',
        role=role,
        models=[
            sklearn_model
        ]
    )

    print("FINISH - MODEL")

    step_register_inference_model = RegisterModel(
        name="RegisterModel",
        estimator=ridge_train,
        content_types=["text/csv"],
        response_types=["text/csv"],
        transform_instances=["ml.t3.large"],
        model_package_group_name=model_package_group_name,
        approval_status="Approved",
        # model_metrics=model_metrics,
        model=model
    )

    print("FINISH - REGISTER")

    # condition step for evaluating model quality and branching execution
    cond_lte = ConditionLessThanOrEqualTo(
        left=JsonGet(
            step=step_eval,
            property_file=evaluation_report,
            json_path="regression_metrics.mse.value",
        ),
        right=6.0,
    )

    print("FINISH - COND1")

    step_cond = ConditionStep(
        name="CheckMSEEvaluation",
        conditions=[cond_lte],
        if_steps=[step_register_inference_model],
        else_steps=[],
    )

    print("FINISH - COND STEP")

    # pipeline instance
    pipeline = Pipeline(
        name=pipeline_name,
        steps=[step_process, step_train, step_eval, step_cond],
        sagemaker_session=sagemaker_session,
    )

    print("FINISH - PIPELINE")

    return pipeline
