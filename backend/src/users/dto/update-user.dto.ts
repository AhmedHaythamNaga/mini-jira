import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsIn(['admin', 'manager', 'employee'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}
