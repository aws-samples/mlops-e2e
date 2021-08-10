#!/bin/bash

set -e

VIRTUAL_ENV=.venv
TEST_REPORT_PATH=reports/reports.xml

# Set up virtual env
virtualenv -p python3 $VIRTUAL_ENV
. $VIRTUAL_ENV/bin/activate

#Install requirements
pip install -r tests/requirements.txt
pip install pyflakes==2.1.1

echo "Running pyflakes to detect any import / syntax issues"
pyflakes ./**/*.py

echo "Running tests"
export PYTHONPATH=./src
pytest --tb=short --junitxml=$TEST_REPORT_PATH ./tests

# Deactivate virtual envs
deactivate