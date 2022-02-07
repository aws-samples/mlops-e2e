// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Construct } from 'constructs';
import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { WebsiteApiConstruct } from './websiteAPIConstruct';
import { WebsiteConstruct } from './websiteConstruct';

export interface InfrastructureStackProps extends StackProps {
    readonly ipPermitList: string[];
    readonly projectName: string;
    readonly modelEndpointExportNamePrefix: string;
    readonly websiteDistPath: string;
}

export class InfrastructureStack extends Stack {
    constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
        super(scope, id, props);

        const sageMakeEndpointARN = Fn.importValue(`${props.modelEndpointExportNamePrefix}-${props.projectName}`);
        const sageMakerEndpointName = Fn.importValue(
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
