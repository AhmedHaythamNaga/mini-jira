"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const dynamodb_module_1 = require("./dynamodb/dynamodb.module");
const health_module_1 = require("./health/health.module");
const auth_module_1 = require("./auth/auth.module");
const auth_guard_1 = require("./auth/auth.guard");
const users_module_1 = require("./users/users.module");
const teams_module_1 = require("./teams/teams.module");
const projects_module_1 = require("./projects/projects.module");
const tasks_module_1 = require("./tasks/tasks.module");
const comments_module_1 = require("./comments/comments.module");
const audit_module_1 = require("./audit/audit.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            dynamodb_module_1.DynamoDBModule,
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            teams_module_1.TeamsModule,
            projects_module_1.ProjectsModule,
            tasks_module_1.TasksModule,
            comments_module_1.CommentsModule,
            audit_module_1.AuditModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useExisting: auth_guard_1.AuthGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map