import { ConfigService } from '@nestjs/config';
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly config;
    private readonly cognitoClient;
    private readonly clientId;
    constructor(config: ConfigService);
    login(dto: LoginDto): Promise<{
        idToken: string | undefined;
        accessToken: string | undefined;
        refreshToken: string | undefined;
        expiresIn: number | undefined;
    }>;
}
export {};
