import {
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  MinLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVideoDto {
  @ApiProperty({ example: 'Amazing Summer Collection Video' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({
    example: 'This video showcases our new summer collection',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/video.mp4' })
  @IsUrl()
  video_url: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsUrl()
  cover_url?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration_seconds?: number;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  file_size?: number;
}
