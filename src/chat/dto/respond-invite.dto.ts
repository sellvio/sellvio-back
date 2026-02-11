import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class RespondInviteDto {
  @ApiProperty({
    example: 'accepted',
    enum: ['accepted', 'declined'],
    description: 'Whether to accept or decline the invite',
  })
  @IsString()
  @IsIn(['accepted', 'declined'])
  action!: 'accepted' | 'declined';
}
