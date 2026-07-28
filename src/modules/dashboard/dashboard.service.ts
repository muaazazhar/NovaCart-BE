import { Injectable } from '@nestjs/common';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueAgg,
      pendingOrders,
      recentOrders,
      topProductRows,
      salesByStatus,
      monthlySales,
      lowStock,
      thisMonthOrders,
      lastMonthOrders,
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthCustomers,
      lastMonthCustomers,
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
      this.prisma.order.count({ where: { createdAt: { gte: startOfThisMonth } } }),
      this.prisma.order.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'PAID', createdAt: { gte: startOfThisMonth } },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { total: true },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: startOfThisMonth } },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
      }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.total || 0);
    const topProducts = topProductRows.map((product) => ({
      ...product,
      units: product.soldCount,
      revenue: Number(product.price) * product.soldCount,
    }));

    const conversionRate =
      totalUsers > 0 ? Number(((totalOrders / totalUsers) * 100).toFixed(2)) : 0;
    const lastMonthConversion =
      lastMonthCustomers > 0
        ? Number(((lastMonthOrders / lastMonthCustomers) * 100).toFixed(2))
        : 0;
    const thisMonthConversion =
      thisMonthCustomers > 0
        ? Number(((thisMonthOrders / thisMonthCustomers) * 100).toFixed(2))
        : conversionRate;

    return {
      message: 'Dashboard overview',
      data: {
        kpis: {
          totalUsers,
          totalCustomers: totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue,
          pendingOrders,
          lowStockCount: lowStock.filter((p) => p.stock <= p.lowStockThreshold).length,
          conversionRate,
          revenueChange: this.pctChange(
            Number(thisMonthRevenue._sum.total || 0),
            Number(lastMonthRevenue._sum.total || 0),
          ),
          ordersChange: this.pctChange(thisMonthOrders, lastMonthOrders),
          customersChange: this.pctChange(thisMonthCustomers, lastMonthCustomers),
          conversionChange: this.pctChange(thisMonthConversion, lastMonthConversion),
        },
        recentOrders,
        topProducts,
        salesByStatus: salesByStatus.map((row) => ({
          status: row.status,
          count: row._count.status,
        })),
        monthlySales,
        lowStockProducts: lowStock.filter((p) => p.stock <= p.lowStockThreshold),
      },
    };
  }

  private pctChange(current: number, previous: number): number | null {
    if (previous <= 0) return current > 0 ? 100 : null;
    return Number((((current - previous) / previous) * 100).toFixed(1));
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
