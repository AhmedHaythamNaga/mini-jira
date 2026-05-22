import { IsEmail, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsIn(['admin', 'manager', 'employee'])
  role!: string;

  @IsString()
  @IsOptional()
  teamID?: string;
}
