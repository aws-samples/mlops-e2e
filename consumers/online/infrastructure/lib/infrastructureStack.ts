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
import { WebsiteApiConstruct } from './websiteAPIConstruct';
import { WebsiteConstruct } from './websiteConstruct';

export interface InfrastructureStackProps extends cdk.StackProps {
    readonly ipPermitList: string[];
    readonly projectName: string;
    readonly modelEndpointExportNamePrefix: string;
    readonly websiteDistPath: string;
}

export class InfrastructureStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: InfrastructureStackProps) {
        super(scope, id, props);

        const sageMakeEndpointARN = cdk.Fn.importValue(`${props.modelEndpointExportNamePrefix}-${props.projectName}`);
        const sageMakerEndpointName = cdk.Fn.importValue(
            `${props.modelEndpointExportNamePrefix}-Name-${props.projectName}`
        );

        const apiConstruct = new WebsiteApiConstruct(this, 'WebsiteAPIConstruct', {
            ipCIDRBlocks: props.ipPermitList,
            sageMakeEndpointARN,
            sageMakerEndpointName,
        });

        new WebsiteConstruct(this, 'WebsiteConstruct', {
            websiteDistPath: props.websiteDistPath,
            api: apiConstruct.api,
        });
    }
}
