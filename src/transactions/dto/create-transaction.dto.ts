import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { transaction_type } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: transaction_type })
  @IsEnum(transaction_type)
  transaction_type: transaction_type;

  @ApiProperty({ example: 100.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'GEL', default: 'GEL' })
  @IsOptional()
  @IsString()
  currency?: string = 'GEL';

  @ApiPropertyOptional({ example: 'Payment for campaign participation' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: { campaign_id: 1, video_id: 2 },
    description: 'Additional metadata about the transaction',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
