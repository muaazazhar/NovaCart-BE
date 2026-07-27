import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddWishlistDto {
  @ApiProperty()
  @IsString()
  productId: string;
}
