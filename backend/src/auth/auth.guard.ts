import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  private getVerifier() {
    if (!this.verifier) {
      const userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID');
      const clientId = this.config.get<string>('COGNITO_CLIENT_ID');
      if (!userPoolId || !clientId) {
        throw new UnauthorizedException('Cognito is not configured');
      }
      this.verifier = CognitoJwtVerifier.create({
        userPoolId,
        tokenUse: 'id',
        clientId,
      });
    }
    return this.verifier;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    try {
      const payload = await this.getVerifier().verify(token);
      request.user = {
        userId: payload.sub,
        email: payload.email as string,
        role: (payload['custom:role'] as string) || 'employee',
        teamId: (payload['custom:teamId'] as string) || '',
        name: (payload.name as string) || (payload.email as string),
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
