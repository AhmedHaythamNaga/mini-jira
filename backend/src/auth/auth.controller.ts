import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  type InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { IsString } from 'class-validator';
import { Public } from './decorators/public.decorator';

class LoginDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;
}

@Controller('auth')
export class AuthController {
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly clientId: string;
  private readonly userPoolId: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    this.cognitoClient = new CognitoIdentityProviderClient({ region });
    this.clientId = this.config.get<string>('COGNITO_CLIENT_ID', '');
    this.userPoolId = this.config.get<string>('COGNITO_USER_POOL_ID', '');
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto) {
    if (!this.clientId) {
      throw new InternalServerErrorException('COGNITO_CLIENT_ID is not configured');
    }

    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    try {
      return await this.issueTokens(email, password);
    } catch (error: unknown) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException(this.mapAuthError(error));
    }
  }

  private async issueTokens(email: string, password: string) {
    let result = await this.initiateAuth(email, password);

    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      await this.clearPasswordChallenge(email, password);
      result = await this.initiateAuth(email, password);
    }

    const idToken = result.AuthenticationResult?.IdToken;
    if (!idToken) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      idToken,
      accessToken: result.AuthenticationResult?.AccessToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
    };
  }

  private async initiateAuth(
    email: string,
    password: string,
  ): Promise<InitiateAuthCommandOutput> {
    return this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    );
  }

  /** Admin-created users can remain in FORCE_CHANGE_PASSWORD until cleared. */
  private async clearPasswordChallenge(email: string, password: string) {
    if (!this.userPoolId) {
      throw new InternalServerErrorException('COGNITO_USER_POOL_ID is not configured');
    }

    await this.cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );

    await this.cognitoClient
      .send(
        new AdminConfirmSignUpCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        }),
      )
      .catch(() => {
        // User may already be confirmed.
      });
  }

  private mapAuthError(error: unknown) {
    const err = error as { name?: string; message?: string };
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
}
