"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBModule = exports.DYNAMO_CLIENT = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
exports.DYNAMO_CLIENT = 'DYNAMO_CLIENT';
let DynamoDBModule = class DynamoDBModule {
};
exports.DynamoDBModule = DynamoDBModule;
exports.DynamoDBModule = DynamoDBModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.DYNAMO_CLIENT,
                useFactory: (config) => {
                    const client = new client_dynamodb_1.DynamoDBClient({
                        region: config.get('AWS_REGION', 'us-east-1'),
                    });
                    return lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
                        marshallOptions: { removeUndefinedValues: true },
                    });
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: [exports.DYNAMO_CLIENT],
    })
], DynamoDBModule);
//# sourceMappingURL=dynamodb.module.js.map