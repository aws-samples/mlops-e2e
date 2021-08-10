#!/bin/bash

set -e

# Copy the Data Manifest file to the main folder

echo "Data Manifest:"
cat ${CODEBUILD_SRC_DIR_SourceDataOutput}/manifest.json

echo "Copying Data Manifest to main folder"
cat ${CODEBUILD_SRC_DIR_SourceDataOutput}/manifest.json > ./dataManifest.json
