import {
  ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) throw new ConflictException('You already reviewed this product');

    const purchased = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: { userId, status: { in: ['DELIVERED', 'CONFIRMED', 'SHIPPED'] } },
      },
    });

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        userId,
        isVerified: !!purchased,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    await this.recalculateProductRating(dto.productId);
    return { message: 'Review submitted', data: review };
  }

  async findByProduct(productId: string, query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where = { productId, isApproved: true };

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async update(id: string, userId: string, dto: UpdateReviewDto, isAdmin = false) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('Not allowed to update this review');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: isAdmin ? dto : { rating: dto.rating, title: dto.title, comment: dto.comment },
    });
    await this.recalculateProductRating(review.productId);
    return { message: 'Review updated', data: updated };
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (!isAdmin && review.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this review');
    }
    await this.prisma.review.delete({ where: { id } });
    await this.recalculateProductRating(review.productId);
    return { message: 'Review deleted', data: null };
  }

  private async recalculateProductRating(productId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: agg._avg.rating || 0,
        reviewCount: agg._count.rating,
      },
    });
  }
}
