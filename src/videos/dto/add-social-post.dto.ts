import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { social_platform } from '@prisma/client';

export class AddSocialPostDto {
  @ApiProperty({
    enum: social_platform,
    example: social_platform.instagram,
    description: 'Social media platform where the video was posted',
  })
  @IsEnum(social_platform)
  platform: social_platform;

  @ApiProperty({
    example: 'https://instagram.com/p/ABC123',
    description: 'Public URL of the social media post',
  })
  @IsUrl()
  post_url: string;

  @ApiProperty({
    example: 'ABC123DEF456',
    description: 'Platform-specific post ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  platform_post_id?: string;
}
