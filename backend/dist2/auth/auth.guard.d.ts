import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
export declare class AuthGuard implements CanActivate {
    private readonly config;
    private readonly reflector;
    private verifier;
    constructor(config: ConfigService, reflector: Reflector);
    private getVerifier;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
