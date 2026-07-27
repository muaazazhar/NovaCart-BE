import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = unknown> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  meta?: Record<string, unknown>;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  path: string;
}
