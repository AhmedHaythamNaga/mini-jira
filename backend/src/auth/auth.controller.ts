import { Controller, Post, Body } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
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

  constructor(private readonly config: ConfigService) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.config.get<string>('AWS_REGION', 'us-east-1'),
    });
    this.clientId = this.config.get<string>('COGNITO_CLIENT_ID', '');
  }

  @Post('login')
  @Public()
  async login(@Body() dto: LoginDto) {
    const result = await this.cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: dto.email,
          PASSWORD: dto.password,
        },
      }),
    );

    return {
      idToken: result.AuthenticationResult?.IdToken,
      accessToken: result.AuthenticationResult?.AccessToken,
      refreshToken: result.AuthenticationResult?.RefreshToken,
      expiresIn: result.AuthenticationResult?.ExpiresIn,
    };
  }
}
