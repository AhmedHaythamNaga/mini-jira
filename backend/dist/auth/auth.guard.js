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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const aws_jwt_verify_1 = require("aws-jwt-verify");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("./decorators/public.decorator");
let AuthGuard = class AuthGuard {
    constructor(config, reflector) {
        this.config = config;
        this.reflector = reflector;
        this.verifier = null;
    }
    getVerifier() {
        if (!this.verifier) {
            const userPoolId = this.config.get('COGNITO_USER_POOL_ID');
            const clientId = this.config.get('COGNITO_CLIENT_ID');
            if (!userPoolId || !clientId) {
                throw new common_1.UnauthorizedException('Cognito is not configured');
            }
            this.verifier = aws_jwt_verify_1.CognitoJwtVerifier.create({
                userPoolId,
                tokenUse: 'id',
                clientId,
            });
        }
        return this.verifier;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or invalid Authorization header');
        }
        const token = authHeader.slice(7);
        try {
            const payload = await this.getVerifier().verify(token);
            request.user = {
                userId: payload.sub,
                email: payload.email,
                role: payload['custom:role'] || 'employee',
                teamId: payload['custom:teamId'] || '',
                name: payload.name || payload.email,
            };
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        core_1.Reflector])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map