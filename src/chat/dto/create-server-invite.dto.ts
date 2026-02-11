import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateServerInviteDto {
  @ApiProperty({ example: 42, description: 'Creator user ID to invite to the server' })
  @IsInt()
  @Min(1)
  user_id!: number;
}
