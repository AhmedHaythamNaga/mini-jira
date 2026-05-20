import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DYNAMO_CLIENT = 'DYNAMO_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: DYNAMO_CLIENT,
      useFactory: (config: ConfigService) => {
        const client = new DynamoDBClient({
          region: config.get<string>('AWS_REGION', 'us-east-1'),
        });
        return DynamoDBDocumentClient.from(client, {
          marshallOptions: { removeUndefinedValues: true },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DYNAMO_CLIENT],
})
export class DynamoDBModule {}
