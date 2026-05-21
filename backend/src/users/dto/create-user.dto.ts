import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  password: string;

  @IsIn(['admin', 'manager', 'employee'])
  role: string;

  @IsString()
  @IsOptional()
  teamId?: string;
}
