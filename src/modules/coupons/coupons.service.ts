import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const code = dto.code.toUpperCase();
    const exists = await this.prisma.coupon.findUnique({ where: { code } });
    if (exists) throw new ConflictException('Coupon code already exists');

    const coupon = await this.prisma.coupon.create({
      data: {
        ...dto,
        code,
        startsAt: new Date(dto.startsAt),
        expiresAt: new Date(dto.expiresAt),
      },
    });
    return { message: 'Coupon created', data: coupon };
  }

  async findAll(query: PaginationDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const where: Prisma.CouponWhereInput = query.search
      ? { code: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return { message: 'Coupon retrieved', data: coupon };
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);
    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code?.toUpperCase(),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    return { message: 'Coupon updated', data: coupon };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { message: 'Coupon deactivated', data: null };
  }

  async validate(userId: string, dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid coupon');
    }
    const now = new Date();
    if (now < coupon.startsAt || now > coupon.expiresAt) {
      throw new BadRequestException('Coupon is not active at this time');
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.minOrderAmount && dto.orderAmount < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount}`);
    }

    const userUsage = await this.prisma.order.count({
      where: { userId, couponId: coupon.id, status: { not: 'CANCELLED' } },
    });
    if (userUsage >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (dto.orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, Number(coupon.maxDiscount));
      }
    } else {
      discount = Number(coupon.discountValue);
    }
    discount = Math.min(discount, dto.orderAmount);

    return {
      message: 'Coupon is valid',
      data: {
        coupon,
        discountAmount: Number(discount.toFixed(2)),
      },
    };
  }

  calculateDiscount(coupon: { discountType: DiscountType; discountValue: any; maxDiscount: any }, amount: number) {
    let discount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (amount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    } else {
      discount = Number(coupon.discountValue);
    }
    return Math.min(discount, amount);
  }
}
