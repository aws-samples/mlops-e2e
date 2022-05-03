// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { FunctionComponent, useMemo } from 'react';
import FormRenderer, { componentTypes, validatorTypes } from 'aws-northstar/components/FormRenderer';
import { DataType } from '@aws-prototype/model-consumer-online-data-type';

export interface AbaloneInsightFormProps {
    onSubmit: (data: DataType) => void;
}

const getSchema = () => {
    return {
        header: 'Predict Abalone age',
        canReset: true,
        canCancel: false,
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

const AbaloneInsightForm: FunctionComponent<AbaloneInsightFormProps> = ({ onSubmit }) => {
    const schema = useMemo(() => getSchema(), []);

    return <FormRenderer schema={schema} onSubmit={(data) => onSubmit(data as DataType)} />;
};

export default AbaloneInsightForm;
