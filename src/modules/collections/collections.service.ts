import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCollectionDto) {
    const slug = dto.slug || slugify(dto.name);
    const exists = await this.prisma.collection.findUnique({ where: { slug } });
    if (exists) throw new ConflictException('Collection slug already exists');

    const { productIds, ...data } = dto;
    const collection = await this.prisma.collection.create({
      data: {
        ...data,
        slug,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        products: productIds?.length
          ? {
              create: productIds.map((productId, i) => ({
                productId,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        products: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },
      },
    });
    return { message: 'Collection created', data: collection };
  }

  async findAll(featuredOnly = false) {
    const collections = await this.prisma.collection.findMany({
      where: {
        isActive: true,
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });
    return { message: 'Collections retrieved', data: collections };
  }

  async findOne(idOrSlug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        products: {
          orderBy: { sortOrder: 'asc' },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                brand: true,
                category: true,
              },
            },
          },
        },
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return { message: 'Collection retrieved', data: collection };
  }

  async update(id: string, dto: UpdateCollectionDto) {
    await this.findOne(id);
    const { productIds, ...data } = dto;

    if (productIds) {
      await this.prisma.collectionProduct.deleteMany({ where: { collectionId: id } });
    }

    const collection = await this.prisma.collection.update({
      where: { id },
      data: {
        ...data,
        slug: dto.slug || (dto.name ? slugify(dto.name) : undefined),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        products: productIds?.length
          ? {
              create: productIds.map((productId, i) => ({
                productId,
                sortOrder: i,
              })),
            }
          : undefined,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
    });
    return { message: 'Collection updated', data: collection };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.collection.delete({ where: { id } });
    return { message: 'Collection deleted', data: null };
  }
}
