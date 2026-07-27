import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, PaginationDto, resolvePagination } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.prisma.brand.findFirst({
      where: { OR: [{ slug }, { name: dto.name }] },
    });
    if (exists) throw new ConflictException('Brand already exists');

    const brand = await this.prisma.brand.create({ data: { ...dto, slug } });
    return { message: 'Brand created', data: brand };
  }

  async findAll(query: PaginationDto) {
    const { page, limit, search } = resolvePagination(query);
    const skip = (page - 1) * limit;
    const where: Prisma.BrandWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { deletedAt: null, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { _count: { select: { products: true } } },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return { message: 'Brand retrieved', data: brand };
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    const brand = await this.prisma.brand.update({
      where: { id },
      data: { ...dto, slug: dto.slug || (dto.name ? slugify(dto.name) : undefined) },
    });
    return { message: 'Brand updated', data: brand };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Brand deleted', data: null };
  }
}
