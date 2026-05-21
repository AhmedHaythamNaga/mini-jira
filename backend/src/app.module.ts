import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DynamoDBModule } from './dynamodb/dynamodb.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoDBModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    AuditModule,
    NotificationsModule,
  ],
  providers: [
    // Apply AuthGuard globally — use @Public() to skip on specific routes
    {
      provide: APP_GUARD,
      useExisting: AuthGuard,
    },
  ],
})
export class AppModule {}
