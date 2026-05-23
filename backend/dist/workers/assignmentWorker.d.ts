import type { SQSEvent, SNSEvent } from 'aws-lambda';
export declare const handler: (event: SQSEvent | SNSEvent) => Promise<{
    statusCode: number;
}>;
