import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { generateOrderNumber } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const shipping = await this.prisma.address.findFirst({
      where: { id: dto.shippingAddressId, userId },
    });
    const billing = await this.prisma.address.findFirst({
      where: { id: dto.billingAddressId, userId },
    });
    if (!shipping || !billing) throw new NotFoundException('Address not found');

    let subtotal = 0;
    for (const item of cart.items) {
      const stock = item.variant ? item.variant.stock : item.product.stock;
      if (stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }
      const price = item.variant ? Number(item.variant.price) : Number(item.product.price);
      subtotal += price * item.quantity;
    }

    let couponId: string | undefined;
    let discountAmount = 0;
    if (dto.couponCode) {
      const validation = await this.couponsService.validate(userId, {
        code: dto.couponCode,
        orderAmount: subtotal,
      });
      couponId = validation.data.coupon.id;
      discountAmount = validation.data.discountAmount;
    }

    const shippingAmount = subtotal >= 100 ? 0 : 9.99;
    const taxable = Math.max(subtotal - discountAmount, 0);
    const taxAmount = Number((taxable * 0.08).toFixed(2));
    const total = Number((taxable + shippingAmount + taxAmount).toFixed(2));

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
          subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          total,
          notes: dto.notes,
          couponId,
          shippingAddressId: dto.shippingAddressId,
          billingAddressId: dto.billingAddressId,
          items: {
            create: cart.items.map((item) => {
              const unitPrice = item.variant
                ? Number(item.variant.price)
                : Number(item.product.price);
              return {
                productId: item.productId,
                variantId: item.variantId,
                productName: item.product.name,
                productSku: item.variant?.sku || item.product.sku,
                variantName: item.variant?.name,
                quantity: item.quantity,
                unitPrice,
                totalPrice: unitPrice * item.quantity,
                image: item.product.images[0]?.url,
              };
            }),
          },
        },
        include: {
          items: true,
          shippingAddress: true,
          billingAddress: true,
          coupon: true,
        },
      });

      for (const item of cart.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    await this.notificationsService.create(userId, {
      type: 'ORDER',
      title: 'Order placed',
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await this.activityLogs.log({
      userId,
      action: 'CREATE',
      module: 'orders',
      resourceId: order.id,
      description: `Order ${order.orderNumber} created`,
    });

    return { message: 'Order created', data: order };
  }

  async findAll(query: QueryOrderDto, requester?: { id: string; role: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const isAdmin = requester && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(requester.role);
    const where: Prisma.OrderWhereInput = {
      ...(isAdmin ? (query.userId ? { userId: query.userId } : {}) : { userId: requester?.id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.search
        ? { orderNumber: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          coupon: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string, requester: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        coupon: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPPORT'].includes(requester.role);
    if (!isAdmin && order.userId !== requester.id) {
      throw new ForbiddenException('Access denied');
    }
    return { message: 'Order retrieved', data: order };
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, actorId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const data: Prisma.OrderUpdateInput = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === OrderStatus.SHIPPED) {
        data.shippedAt = new Date();
        data.trackingNumber = dto.trackingNumber;
      }
      if (dto.status === OrderStatus.DELIVERED) data.deliveredAt = new Date();
      if (dto.status === OrderStatus.CANCELLED) {
        data.cancelledAt = new Date();
        data.cancelReason = dto.cancelReason;
      }
    }
    if (dto.paymentStatus) data.paymentStatus = dto.paymentStatus;
    if (dto.trackingNumber) data.trackingNumber = dto.trackingNumber;

    const updated = await this.prisma.order.update({
      where: { id },
      data,
      include: { items: true },
    });

    await this.notificationsService.create(order.userId, {
      type: 'ORDER',
      title: 'Order updated',
      message: `Your order ${order.orderNumber} status is now ${updated.status}.`,
      data: { orderId: order.id, status: updated.status },
    });

    await this.activityLogs.log({
      userId: actorId,
      action: 'UPDATE',
      module: 'orders',
      resourceId: id,
      description: `Order ${order.orderNumber} updated`,
      metadata: dto as any,
    });

    return { message: 'Order updated', data: updated };
  }

  async cancel(id: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');
    if (!( [OrderStatus.PENDING, OrderStatus.CONFIRMED] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason || 'Cancelled by customer',
        },
      });

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            soldCount: { decrement: item.quantity },
          },
        });
      }
    });

    return { message: 'Order cancelled', data: null };
  }
}
