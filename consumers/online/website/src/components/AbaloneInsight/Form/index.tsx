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
import { FunctionComponent, useMemo } from 'react';
import FormRenderer, { componentTypes, validatorTypes } from 'aws-northstar/components/FormRenderer';
import { DataType } from 'data-type';

export interface AbaloneInsightFormProps {
    onCancel?: () => void;
    onSubmit?: (data: DataType) => void;
}

const getSchema = () => {
    return {
        header: 'Predict Abalone age',
        fields: [
            {
                component: componentTypes.SELECT,
                name: 'sex',
                label: 'Sex',
                isRequired: true,
                options: [
                    {
                        label: 'Female',
                        value: 'F',
                    },
                    {
                        label: 'Male',
                        value: 'M',
                    },
                    {
                        label: 'Infant',
                        value: 'I',
                    },
                ],
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'length',
                label: 'Length',
                type: 'number',
                isRequired: true,
                description: 'Longest shell measurement (mm)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'diameter',
                label: 'Diameter',
                type: 'number',
                isRequired: true,
                description: 'Perpendicular to length (mm)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'height',
                label: 'Height',
                type: 'number',
                isRequired: true,
                description: 'Height with meat in shell (mm)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'wholeWeight',
                label: 'Whole weight',
                type: 'number',
                isRequired: true,
                description: 'Weight of whole abalone (grams)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'shuckedWeight',
                label: 'Shucked weight',
                type: 'number',
                isRequired: true,
                description: 'Weight of abalone meat (grams)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'visceraWeight',
                label: 'Viscera weight',
                description: 'Gut weight after bleeding (grams)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
            {
                component: componentTypes.TEXT_FIELD,
                name: 'shellWeight',
                label: 'Shell weight',
                description: 'Weight after being dried (grams)',
                validate: [
                    {
                        type: validatorTypes.REQUIRED,
                    },
                ],
            },
        ],
    };
};

const AbaloneInsightForm: FunctionComponent<AbaloneInsightFormProps> = ({ onSubmit, onCancel }) => {
    const schema = useMemo(() => getSchema(), []);

    return <FormRenderer schema={schema} onSubmit={(data) => onSubmit?.(data as DataType)} onCancel={onCancel} />;
};

export default AbaloneInsightForm;
