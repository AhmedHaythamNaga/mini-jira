import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('tasks/:taskId/audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findByTask(@Param('taskId') taskId: string) {
    return this.auditService.findByTask(taskId);
  }
}
