import { Injectable, NotFoundException } from '@nestjs/common';
import { BannerPosition } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class HeroBannersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBannerDto) {
    const banner = await this.prisma.heroBanner.create({
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
    return { message: 'Banner created', data: banner };
  }

  async findActive(position?: BannerPosition) {
    const now = new Date();
    const banners = await this.prisma.heroBanner.findMany({
      where: {
        isActive: true,
        ...(position ? { position } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { message: 'Active banners retrieved', data: banners };
  }

  async findAll() {
    const banners = await this.prisma.heroBanner.findMany({
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
    });
    return { message: 'Banners retrieved', data: banners };
  }

  async findOne(id: string) {
    const banner = await this.prisma.heroBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return { message: 'Banner retrieved', data: banner };
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.findOne(id);
    const banner = await this.prisma.heroBanner.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
    return { message: 'Banner updated', data: banner };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.heroBanner.delete({ where: { id } });
    return { message: 'Banner deleted', data: null };
  }
}
