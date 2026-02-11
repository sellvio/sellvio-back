import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateServerDto {
  @ApiProperty({
    description: 'New name for the chat server',
    example: 'Summer Campaign Chat',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name!: string;
}
