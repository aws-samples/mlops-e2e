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
import { useState, useCallback } from 'react';
import { FunctionComponent } from 'react';
import Button from 'aws-northstar/components/Button';
import Box from 'aws-northstar/layouts/Box';
import Alert from 'aws-northstar/components/Alert';
import AbaloneInsightForm from '../../components/AbaloneInsight/Form';
import AbaloneInsightResult from '../../components/AbaloneInsight/Result';
import { DataType } from 'data-type';
import { apiPost } from '../../utils/api';

const AbaloneInsight: FunctionComponent = () => {
    const [state, setState] = useState<'form' | 'result' | 'home'>('home');
    const [insight, setInsight] = useState<DataType>();
    const [getInferenceError, setGetInferenceError] = useState();
    const [feedbackSubmited, setFeedbackSubmited] = useState(false);

    const handlePredict = useCallback(() => {
        setGetInferenceError(undefined);
        setInsight(undefined);
        setFeedbackSubmited(false);
        setState('form');
    }, []);

    const handleInsightFormCancel = useCallback(() => {
        setGetInferenceError(undefined);
        setInsight(undefined);
        setFeedbackSubmited(false);
        setState('home');
    }, []);

    const handleInsightFormSubmit = useCallback(async (data: DataType) => {
        try {
            const response = await apiPost<DataType>('data', data);
            setGetInferenceError(undefined);
            setInsight(response);
            setState('result');
        } catch (e) {
            console.log(e);
            setGetInferenceError(e);
            setInsight(undefined);
        }
    }, []);

    const handleFeedbackFormCancel = useCallback(() => {
        setGetInferenceError(undefined);
        setInsight(undefined);
        setFeedbackSubmited(false);
        setState('home');
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
        case 'form':
            return (
                <>
                    {getInferenceError && (
                        <Box width="100%" display="flex" justifyContent="center" p={10}>
                            <Alert type="error" header="Error">
                                {JSON.stringify(getInferenceError)}
                            </Alert>
                        </Box>
                    )}
                    <AbaloneInsightForm onCancel={handleInsightFormCancel} onSubmit={handleInsightFormSubmit} />
                </>
            );
        case 'result':
            return (
                <AbaloneInsightResult
                    feedbackSubmited={feedbackSubmited}
                    data={insight}
                    onCancel={handleFeedbackFormCancel}
                    onSubmit={handleFeedbackFormSubmit}
                />
            );
        default:
            return (
                <Button variant="primary" onClick={handlePredict}>
                    Predict Abalone age
                </Button>
            );
    }
};

export default AbaloneInsight;
