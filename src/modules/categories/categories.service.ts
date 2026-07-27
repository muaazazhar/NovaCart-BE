import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginate, PaginationDto, resolvePagination } from '../../common/dto/pagination.dto';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.prisma.category.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Category slug already exists');

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    const category = await this.prisma.category.create({
      data: { ...dto, slug },
      include: { parent: true, children: true },
    });
    return { message: 'Category created', data: category };
  }

  async findAll(query: PaginationDto) {
    const { page, limit, search } = resolvePagination(query);
    const skip = (page - 1) * limit;
    const where: Prisma.CategoryWhereInput = {
      deletedAt: null,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          parent: true,
          children: true,
          _count: { select: { products: true } },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findTree() {
    const categories = await this.prisma.category.findMany({
      where: { deletedAt: null, parentId: null, isActive: true },
      include: {
        children: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { message: 'Category tree retrieved', data: categories };
  }

  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return { message: 'Category retrieved', data: category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.slug) {
      const exists = await this.prisma.category.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (exists) throw new ConflictException('Slug already in use');
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: { ...dto, slug: dto.slug || (dto.name ? slugify(dto.name) : undefined) },
      include: { parent: true, children: true },
    });
    return { message: 'Category updated', data: category };
  }

  async remove(id: string) {
    await this.findOne(id);
    const products = await this.prisma.product.count({ where: { categoryId: id, deletedAt: null } });
    if (products > 0) throw new ConflictException('Category has products');
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Category deleted', data: null };
  }
}
