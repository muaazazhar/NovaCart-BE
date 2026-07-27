import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BannerPosition, RoleName } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { HeroBannersService } from './hero-banners.service';

@ApiTags('Hero Banners')
@Controller('banners')
export class HeroBannersController {
  constructor(private readonly bannersService: HeroBannersService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('banners:create')
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get active banners for storefront' })
  findActive(@Query('position') position?: BannerPosition) {
    return this.bannersService.findActive(position);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('banners:read')
  findAll() {
    return this.bannersService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('banners:read')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.MANAGER)
  @RequirePermissions('banners:update')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
  @RequirePermissions('banners:delete')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
