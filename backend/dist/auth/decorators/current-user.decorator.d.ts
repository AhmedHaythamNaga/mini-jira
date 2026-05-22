export interface AuthUser {
    userId: string;
    email: string;
    role: string;
    teamId: string;
    name: string;
}
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | keyof AuthUser | undefined)[]) => ParameterDecorator;
