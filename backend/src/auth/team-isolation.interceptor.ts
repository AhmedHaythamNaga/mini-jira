import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Team Isolation Interceptor
 * For employees, injects teamID from the verified Cognito token into
 * request query/body so that downstream services always filter by team.
 * Managers and admins bypass team isolation.
 */
@Injectable()
export class TeamIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.role === 'employee' && user.teamId) {
      // Inject teamID into query params for GET requests
      request.query = { ...request.query, teamID: user.teamId };
      // Inject teamID into body for POST/PUT requests
      if (request.body && typeof request.body === 'object') {
        request.body.teamID = user.teamId;
      }
    }

    return next.handle();
  }
}
