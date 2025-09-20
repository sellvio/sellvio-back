import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful',
  })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp of the response',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/endpoint', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp of the error',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/endpoint', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'Bad Request', description: 'Error type' })
  error: string;

  @ApiProperty({
    example: 'Detailed error message',
    description: 'Detailed error description',
  })
  message: string;
}
