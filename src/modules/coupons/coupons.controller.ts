import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('coupons:create')
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('coupons:read')
  findAll(@Query() query: PaginationDto) {
    return this.couponsService.findAll(query);
  }

  @Post('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a coupon code' })
  validate(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(user.id, dto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('coupons:read')
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('coupons:update')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @RequirePermissions('coupons:delete')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
