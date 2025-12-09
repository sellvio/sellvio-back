import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
} from 'class-validator';

export class AddMembersDto {
  @ApiProperty({
    example: [11, 12, 13],
    description: 'Creator user ids to add to the channel',
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


