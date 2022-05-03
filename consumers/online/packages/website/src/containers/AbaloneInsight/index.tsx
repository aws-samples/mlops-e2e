// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { useState, useCallback } from 'react';
import { FunctionComponent } from 'react';
import Box from 'aws-northstar/layouts/Box';
import Alert from 'aws-northstar/components/Alert';
import AbaloneInsightForm from '../../components/AbaloneInsight/Form';
import AbaloneInsightResult from '../../components/AbaloneInsight/Result';
import { DataType } from '@aws-prototype/model-consumer-online-data-type';
import { apiPost } from '../../utils/api';

const AbaloneInsight: FunctionComponent = () => {
    const [state, setState] = useState<'form' | 'result'>('form');
    const [insight, setInsight] = useState<DataType>();
    const [getInferenceError, setGetInferenceError] = useState<string>();
    const [feedbackSubmited, setFeedbackSubmited] = useState(false);

    const handleInsightFormSubmit = useCallback(async (data: DataType) => {
        try {
            const response = await apiPost<DataType>('data', data);
            setGetInferenceError(undefined);
            setInsight(response);
            setState('result');
        } catch (e) {
            console.log(e);
            const message = (e as Error).message;
            setGetInferenceError(message || 'Inference Error');
            setInsight(undefined);
        }
    }, []);

    const handleNewPrediction = useCallback(() => {
        setGetInferenceError(undefined);
        setInsight(undefined);
        setFeedbackSubmited(false);
        setState('form');
    }, []);

    const handleFeedbackFormSubmit = useCallback(
        async (data: any) => {
            try {
                await apiPost<DataType>(`data/${insight?.id}`, data);
                setFeedbackSubmited(true);
            } catch (e) {
                console.log(e);
            }
        },
        [insight]
    );

    switch (state) {
        case 'result':
            return (
                <AbaloneInsightResult
                    feedbackSubmited={feedbackSubmited}
                    data={insight}
                    onNewClick={handleNewPrediction}
                    onSubmit={handleFeedbackFormSubmit}
                />
            );
        default:
            return (
                <>
                    {getInferenceError && (
                        <Box width="100%" display="flex" justifyContent="center" p={1}>
                            <Alert type="error" header="Error">
                                {JSON.stringify(getInferenceError)}
                            </Alert>
                        </Box>
                    )}
                    <AbaloneInsightForm onSubmit={handleInsightFormSubmit} />
                </>
            );
    }
};

export default AbaloneInsight;
