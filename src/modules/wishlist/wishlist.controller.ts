import {
  Body, Controller, Delete, Get, Param, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddWishlistDto) {
    return this.wishlistService.add(user.id, dto.productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get wishlist' })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.wishlistService.findAll(user.id, query);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear wishlist' })
  clear(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.clear(user.id);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}
