import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module';
// import { TeamsModule } from './teams/teams.module';
// import { ProjectsModule } from './projects/projects.module';
// import { TasksModule } from './tasks/tasks.module';
// import { CommentsModule } from './comments/comments.module';
// import { AuditModule } from './audit/audit.module';
// import { NotificationsModule } from './notifications/notifications.module';
// import { DynamoDBModule } from './dynamodb/dynamodb.module';
// import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ConfigModule.forRoot({ isGlobal: true }),
    // DynamoDBModule,
    // HealthModule,
    // AuthModule,
    // UsersModule,
    // TeamsModule,
    // ProjectsModule,
    // TasksModule,
    // CommentsModule,
    // AuditModule,
    // NotificationsModule,
  ],
})
export class AppModule {}
