// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export interface DataType {
    sex: 'I' | 'F' | 'M';
    length: number;
    diameter: number;
    height: number;
    wholeWeight: number;
    shuckedWeight: number;
    visceraWeight: number;
    shellWeight: number;

    id: string;
    predict?: number;
    actual?: number;
}

export interface AddLabelRequest {
    actual: number;
}
