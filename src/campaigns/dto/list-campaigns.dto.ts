import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { campaign_status } from '@prisma/client';

export class ListCampaignsDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: campaign_status,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(campaign_status)
  status?: campaign_status;

  @ApiPropertyOptional({ description: 'Filter by business ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  business_id?: number;
}
