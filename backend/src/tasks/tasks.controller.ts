import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { AttachImageDto } from './dto/attach-image.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { TeamIsolationInterceptor } from '../auth/team-isolation.interceptor';

@Controller('tasks')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(TeamIsolationInterceptor)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('admin', 'manager')
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tasksService.findAll(user);
  }

  @Get('by-project/:projectId')
  findByProject(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.findByProject(projectId, user);
  }

  @Get('by-assignee/:assigneeId')
  findByAssignee(@Param('assigneeId') assigneeId: string) {
    return this.tasksService.findByAssignee(assigneeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Put(':id/assign')
  @Roles('admin', 'manager')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.assign(id, dto.assigneeId, user);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }

  // ---- Image endpoints ----

  @Get(':id/upload-url')
  getUploadUrl(@Param('id') id: string) {
    return this.tasksService.getUploadUrl(id);
  }

  @Put(':id/image')
  attachImage(@Param('id') id: string, @Body() dto: AttachImageDto) {
    return this.tasksService.attachImage(id, dto.imageKey);
  }

  @Get(':id/image')
  getImageUrl(
    @Param('id') id: string,
    @Query('variant') variant?: 'original' | 'resized',
  ) {
    return this.tasksService.getImageUrl(id, variant || 'resized');
  }
}
