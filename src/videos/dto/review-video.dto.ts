import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { video_status } from '@prisma/client';

export class ReviewVideoDto {
  @ApiProperty({ enum: video_status, example: video_status.approved })
  @IsEnum(video_status)
  status: video_status;

  @ApiPropertyOptional({ example: 'Great video! Well done.' })
  @IsOptional()
  @IsString()
  review_comments?: string;
}
