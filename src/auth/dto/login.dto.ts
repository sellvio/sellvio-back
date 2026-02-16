import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const USER_TYPE_VALUES = ['business', 'creator'];

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    enum: USER_TYPE_VALUES,
    description: 'Optional user type to assert on login',
  })
  @IsOptional()
  @IsIn(USER_TYPE_VALUES)
  user_type?: string;
}
