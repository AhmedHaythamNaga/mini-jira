import { ConfigService } from '@nestjs/config';
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly config;
    private readonly cognitoClient;
    private readonly clientId;
    private readonly userPoolId;
    constructor(config: ConfigService);
    login(dto: LoginDto): Promise<{
        idToken: string;
        accessToken: string | undefined;
        refreshToken: string | undefined;
        expiresIn: number | undefined;
    }>;
    private issueTokens;
    private initiateAuth;
    private clearPasswordChallenge;
    private mapAuthError;
}
export {};
