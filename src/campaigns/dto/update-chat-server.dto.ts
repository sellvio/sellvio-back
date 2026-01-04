import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateChatServerDto {
  @ApiPropertyOptional({
    description: 'New name for the chat server',
    example: 'Summer Campaign Chat',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'New description for the chat server',
    example: 'Official chat server for the Summer Collection Campaign',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
