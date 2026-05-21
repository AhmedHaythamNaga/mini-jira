import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;
}
