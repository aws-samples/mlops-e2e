import logging
import pathlib
import tarfile

import joblib
import pandas as pd
import os



def is_within_directory(directory, target):
    abs_directory = os.path.abspath(directory)
    abs_target = os.path.abspath(target)

    prefix = os.path.commonprefix([abs_directory, abs_target])

    return prefix == abs_directory


def safe_extract(tar, path="."):
    for member in tar.getmembers():
        member_path = os.path.join(path, member.name)
        if not is_within_directory(path, member_path):
            raise Exception("Attempted Path Traversal in Tar File")
    tar.extractall(path)


logger = logging.getLogger()
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.StreamHandler())

if __name__ == "__main__":
    logger.debug("Starting Prediction.")
    model_path = "/opt/ml/processing/model/model.tar.gz"
    with tarfile.open(model_path) as tar:
        safe_extract(tar, path=".")

    logger.debug("Loading Ridge model.")
    model = joblib.load("model.joblib")

    logger.debug("Reading data.")
    data_to_predict_path = "/opt/ml/processing/transform/data_to_predict.csv"
    data_to_predict = pd.read_csv(data_to_predict_path, header=None)

    logger.info("Performing predictions against data.")
    predictions = model.predict(data_to_predict.iloc[:, 1:])

    output_dir = "/opt/ml/processing/predictions"
    pathlib.Path(output_dir).mkdir(parents=True, exist_ok=True)

    logger.info("Writing out predictions")
    pd.DataFrame(predictions).to_csv(f"{output_dir}/predictions.csv", header=False, index=False)
