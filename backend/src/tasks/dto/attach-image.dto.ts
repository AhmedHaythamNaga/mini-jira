import { IsString } from 'class-validator';

export class AttachImageDto {
  @IsString()
  imageKey: string;
}
