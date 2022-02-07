// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { FunctionComponent } from 'react';
import NorthStarThemeProvider from 'aws-northstar/components/NorthStarThemeProvider';
import AppLayout from 'aws-northstar/layouts/AppLayout';
import Header from 'aws-northstar/components/Header';
import AbaloneInsight from '../AbaloneInsight';

const App: FunctionComponent = () => {
    const header = <Header title="Abalone Insight" />;

    return (
        <NorthStarThemeProvider>
            <AppLayout header={header}>
                <AbaloneInsight />
            </AppLayout>
        </NorthStarThemeProvider>
    );
};

export default App;
