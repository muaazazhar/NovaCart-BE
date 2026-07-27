import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) throw new ConflictException('Product already in wishlist');

    const item = await this.prisma.wishlistItem.create({
      data: { userId, productId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            brand: true,
          },
        },
      },
    });
    return { message: 'Added to wishlist', data: item };
  }

  async findAll(userId: string, query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              brand: true,
              category: true,
            },
          },
        },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async remove(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!item) throw new NotFoundException('Wishlist item not found');
    await this.prisma.wishlistItem.delete({ where: { id: item.id } });
    return { message: 'Removed from wishlist', data: null };
  }

  async clear(userId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId } });
    return { message: 'Wishlist cleared', data: null };
  }
}
