import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class CreateServerInvitesDto {
  @ApiProperty({
    example: [11, 12, 13],
    description: 'Creator user IDs to invite to the server',
    isArray: true,
    type: Number,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  user_ids!: number[];
}
