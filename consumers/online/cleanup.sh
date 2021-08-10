#!/bin/bash

set -e

pushd ./infrastructure
cdk destory
popd