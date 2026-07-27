import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { generateSku, slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const slug = dto.slug || slugify(dto.name);
    const count = await this.prisma.product.count();
    const sku = dto.sku || generateSku('NC', count + 1);

    const exists = await this.prisma.product.findFirst({
      where: { OR: [{ slug }, { sku }] },
    });
    if (exists) throw new ConflictException('Product slug or SKU already exists');

    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId } });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    const { images, ...productData } = dto;
    const product = await this.prisma.product.create({
      data: {
        ...productData,
        slug,
        sku,
        status: dto.status || ProductStatus.DRAFT,
        tags: dto.tags || [],
        specifications: dto.specifications as Prisma.InputJsonValue,
        images: images?.length
          ? {
              create: images.map((img, i) => ({
                url: img.url,
                alt: img.alt || dto.name,
                sortOrder: img.sortOrder ?? i,
                isPrimary: img.isPrimary ?? i === 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    return { message: 'Product created', data: product };
  }

  async findAll(query: QueryProductDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        include: {
          category: true,
          brand: true,
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          _count: { select: { reviews: true, variants: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(idOrSlug: string) {
    const product = await this.prisma.product.findFirst({
      where: { deletedAt: null, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true } },
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });

    return { message: 'Product retrieved', data: product };
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { images, ...productData } = dto;

    if (images) {
      await this.prisma.productImage.deleteMany({ where: { productId: id } });
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        slug: dto.slug || (dto.name ? slugify(dto.name) : undefined),
        specifications: dto.specifications as Prisma.InputJsonValue,
        images: images?.length
          ? {
              create: images.map((img, i) => ({
                url: img.url,
                alt: img.alt,
                sortOrder: img.sortOrder ?? i,
                isPrimary: img.isPrimary ?? i === 0,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: true,
      },
    });

    return { message: 'Product updated', data: product };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
    return { message: 'Product deleted', data: null };
  }

  async featured(limit = 12) {
    const products = await this.prisma.product.findMany({
      where: { isFeatured: true, status: ProductStatus.ACTIVE, deletedAt: null },
      take: limit,
      include: {
        category: true,
        brand: true,
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { soldCount: 'desc' },
    });
    return { message: 'Featured products retrieved', data: products };
  }
}
