import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 42, description: 'Creator user id to add to the channel' })
  @IsInt()
  @Min(1)
  user_id!: number;
}


