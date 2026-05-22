"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const class_validator_1 = require("class-validator");
const public_decorator_1 = require("./decorators/public.decorator");
class LoginDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
let AuthController = class AuthController {
    constructor(config) {
        this.config = config;
        const region = this.config.get('AWS_REGION', 'us-east-1');
        this.cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region });
        this.clientId = this.config.get('COGNITO_CLIENT_ID', '');
        this.userPoolId = this.config.get('COGNITO_USER_POOL_ID', '');
    }
    async login(dto) {
        if (!this.clientId) {
            throw new common_1.InternalServerErrorException('COGNITO_CLIENT_ID is not configured');
        }
        const email = dto.email.trim().toLowerCase();
        const password = dto.password;
        try {
            return await this.issueTokens(email, password);
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException ||
                error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.UnauthorizedException(this.mapAuthError(error));
        }
    }
    async issueTokens(email, password) {
        let result = await this.initiateAuth(email, password);
        if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            await this.clearPasswordChallenge(email, password);
            result = await this.initiateAuth(email, password);
        }
        const idToken = result.AuthenticationResult?.IdToken;
        if (!idToken) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        return {
            idToken,
            accessToken: result.AuthenticationResult?.AccessToken,
            refreshToken: result.AuthenticationResult?.RefreshToken,
            expiresIn: result.AuthenticationResult?.ExpiresIn,
        };
    }
    async initiateAuth(email, password) {
        return this.cognitoClient.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
            },
        }));
    }
    async clearPasswordChallenge(email, password) {
        if (!this.userPoolId) {
            throw new common_1.InternalServerErrorException('COGNITO_USER_POOL_ID is not configured');
        }
        await this.cognitoClient.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: this.userPoolId,
            Username: email,
            Password: password,
            Permanent: true,
        }));
        await this.cognitoClient
            .send(new client_cognito_identity_provider_1.AdminConfirmSignUpCommand({
            UserPoolId: this.userPoolId,
            Username: email,
        }))
            .catch(() => {
        });
    }
    mapAuthError(error) {
        const err = error;
        switch (err.name) {
            case 'NotAuthorizedException':
            case 'UserNotFoundException':
            case 'UserNotConfirmedException':
            case 'PasswordResetRequiredException':
                return 'Invalid email or password';
            case 'InvalidParameterException':
                return err.message?.includes('USER_PASSWORD_AUTH')
                    ? 'USER_PASSWORD_AUTH is not enabled on the Cognito app client'
                    : err.message || 'Invalid login request';
            default:
                return err.message || 'Login failed';
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map