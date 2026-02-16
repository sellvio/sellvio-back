import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VIDEO_STATUS_VALUES = ['approved', 'rejected', 'under_review'];

export class ReviewVideoDto {
  @ApiProperty({ enum: VIDEO_STATUS_VALUES, example: 'approved' })
  @IsIn(VIDEO_STATUS_VALUES)
  status: string;

  @ApiPropertyOptional({ example: 'Great video! Well done.' })
  @IsOptional()
  @IsString()
  review_comments?: string;
}
