import { Injectable } from '@nestjs/common';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueAgg,
      pendingOrders,
      recentOrders,
      topProducts,
      salesByStatus,
      monthlySales,
      lowStock,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null, status: ProductStatus.ACTIVE } }),
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.product.findMany({
        where: { deletedAt: null },
        take: 10,
        orderBy: { soldCount: 'desc' },
        include: { images: { where: { isPrimary: true }, take: 1 } },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.getMonthlySales(),
      this.prisma.product.findMany({
        where: { deletedAt: null, status: { not: ProductStatus.ARCHIVED } },
        take: 50,
        orderBy: { stock: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          lowStockThreshold: true,
        },
      }),
    ]);

    return {
      message: 'Dashboard overview',
      data: {
        kpis: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue: Number(revenueAgg._sum.total || 0),
          pendingOrders,
          lowStockCount: lowStock.filter((p) => p.stock <= p.lowStockThreshold).length,
        },
        recentOrders,
        topProducts,
        salesByStatus,
        monthlySales,
        lowStockProducts: lowStock.filter((p) => p.stock <= p.lowStockThreshold),
      },
    };
  }

  private async getMonthlySales() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        paymentStatus: { in: ['PAID', 'PENDING'] },
      },
      select: { createdAt: true, total: true },
    });

    const map = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, 0);
    }

    for (const order of orders) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + Number(order.total));
      }
    }

    return Array.from(map.entries()).map(([month, revenue]) => ({ month, revenue }));
  }
}
