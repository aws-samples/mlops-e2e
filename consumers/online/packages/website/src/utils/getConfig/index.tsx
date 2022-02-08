// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export interface AppConfig {
    apiUrl: string;
}

const getConfig = (): AppConfig => {
    //@ts-ignore
    return window.__config as AppConfig;
};

export default getConfig;
