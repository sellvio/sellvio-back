import {
  IsEnum,
  IsString,
  IsOptional,
  IsUrl,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { social_platform } from '@prisma/client';

export class ConnectSocialAccountDto {
  @ApiProperty({ enum: social_platform })
  @IsEnum(social_platform)
  platform: social_platform;

  @ApiPropertyOptional({ example: 'johndoe123' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/johndoe123' })
  @IsOptional()
  @IsUrl()
  profile_url?: string;

  @ApiProperty({ example: 'access_token_here' })
  @IsString()
  access_token: string;

  @ApiPropertyOptional({ example: 'refresh_token_here' })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  token_expires_at?: string;
}
