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