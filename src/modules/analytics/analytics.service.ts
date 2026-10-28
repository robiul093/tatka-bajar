import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsPeriod } from './dto/analytics-query.dto';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Today's Key Performance Indicators (KPIs)
   */
  async getTodayStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      todayOrders,
      todayDeliveredOrders,
      todayPendingOrders,
      todayCancelledOrders,
      todayNonCancelledOrders,
      todayNewUsers,
    ] = await Promise.all([
      // Total orders created today
      this.prisma.order.count({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Orders delivered today
      this.prisma.order.count({
        where: {
          status: OrderStatus.DELIVERED,
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Orders currently pending or processing today
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.CONFIRMED, OrderStatus.OUT_FOR_DELIVERY] },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Orders cancelled today
      this.prisma.order.count({
        where: {
          status: OrderStatus.CANCELLED,
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Fetch non-cancelled orders today with items to compute sales & purchase cost
      this.prisma.order.findMany({
        where: {
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
        select: {
          totalAmount: true,
          subtotal: true,
          items: {
            select: {
              buyPrice: true,
              quantity: true,
            },
          },
        },
      }),

      // New users registered today
      this.prisma.user.count({
        where: {
          role: Role.USER,
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
    ]);

    let todaySales = 0;
    let todayPurchaseCost = 0;

    for (const order of todayNonCancelledOrders) {
      todaySales += order.totalAmount;
      for (const item of order.items) {
        todayPurchaseCost += item.buyPrice * item.quantity;
      }
    }

    const todayGrossProfit = Math.max(0, todaySales - todayPurchaseCost);

    return {
      date: startOfToday.toISOString().slice(0, 10),
      todaySales: Number(todaySales.toFixed(2)),
      todayPurchaseCost: Number(todayPurchaseCost.toFixed(2)),
      todayGrossProfit: Number(todayGrossProfit.toFixed(2)),
      todayOrders,
      todayDelivered: todayDeliveredOrders,
      todayPending: todayPendingOrders,
      todayCancelled: todayCancelledOrders,
      todayNewUsers,
    };
  }

  /**
   * High-level platform statistics and business overview
   */
  async getOverviewStats() {
    const [
      totalProducts,
      activeProducts,
      totalCategories,
      totalUsers,
      totalRiders,
      totalOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
      allActiveProducts,
      revenueAggregation,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: Role.USER } }),
      this.prisma.rider.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.DELIVERED } }),
      this.prisma.order.count({ where: { status: OrderStatus.CANCELLED } }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { stock: true, buyPrice: true, price: true },
      }),
      this.prisma.order.aggregate({
        where: { status: { not: OrderStatus.CANCELLED } },
        _sum: { totalAmount: true },
      }),
    ]);

    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let totalInventoryCost = 0;
    let totalInventoryValue = 0;

    for (const product of allActiveProducts) {
      if (product.stock <= 0) {
        outOfStockProducts++;
      } else if (product.stock <= 10) {
        lowStockProducts++;
      }
      totalInventoryCost += product.buyPrice * Math.max(0, product.stock);
      totalInventoryValue += product.price * Math.max(0, product.stock);
    }

    const totalRevenue = revenueAggregation._sum.totalAmount || 0;

    return {
      totalProducts,
      activeProducts,
      totalCategories,
      totalUsers,
      totalRiders,
      totalOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      lowStockProducts,
      outOfStockProducts,
      totalInventoryCost: Number(totalInventoryCost.toFixed(2)),
      totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      estimatedInventoryMargin: Number(
        (totalInventoryValue - totalInventoryCost).toFixed(2),
      ),
    };
  }

  /**
   * Sales timeline and revenue trend over 7d, 30d, or 90d
   */
  async getSalesTimeline(period: AnalyticsPeriod = AnalyticsPeriod.SEVEN_DAYS) {
    const days = period === AnalyticsPeriod.NINETY_DAYS ? 90 : period === AnalyticsPeriod.THIRTY_DAYS ? 30 : 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    // Fetch non-cancelled orders within range with order items
    const orders = await this.prisma.order.findMany({
      where: {
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: startDate },
      },
      select: {
        totalAmount: true,
        status: true,
        createdAt: true,
        items: {
          select: {
            buyPrice: true,
            quantity: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Initialize daily map
    const dailyMap: {
      [key: string]: {
        date: string;
        sales: number;
        orders: number;
        delivered: number;
        cost: number;
        profit: number;
      };
    } = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      dailyMap[dateKey] = {
        date: dateKey,
        sales: 0,
        orders: 0,
        delivered: 0,
        cost: 0,
        profit: 0,
      };
    }

    let totalPeriodSales = 0;
    let totalPeriodOrders = 0;
    let totalPeriodCost = 0;

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().slice(0, 10);
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].sales += order.totalAmount;
        dailyMap[dateKey].orders += 1;
        if (order.status === OrderStatus.DELIVERED) {
          dailyMap[dateKey].delivered += 1;
        }

        let orderCost = 0;
        for (const item of order.items) {
          orderCost += item.buyPrice * item.quantity;
        }
        dailyMap[dateKey].cost += orderCost;
        dailyMap[dateKey].profit += Math.max(0, order.totalAmount - orderCost);

        totalPeriodSales += order.totalAmount;
        totalPeriodOrders += 1;
        totalPeriodCost += orderCost;
      }
    }

    const timeline = Object.values(dailyMap).map((entry) => ({
      date: entry.date,
      sales: Number(entry.sales.toFixed(2)),
      orders: entry.orders,
      delivered: entry.delivered,
      cost: Number(entry.cost.toFixed(2)),
      profit: Number(entry.profit.toFixed(2)),
    }));

    return {
      period,
      days,
      summary: {
        totalSales: Number(totalPeriodSales.toFixed(2)),
        totalOrders: totalPeriodOrders,
        totalCost: Number(totalPeriodCost.toFixed(2)),
        totalProfit: Number(Math.max(0, totalPeriodSales - totalPeriodCost).toFixed(2)),
      },
      timeline,
    };
  }

  /**
   * Top-selling products ranked by sales count and revenue
   */
  async getTopProducts(limit = 10) {
    const products = await this.prisma.product.findMany({
      where: {
        totalSold: { gt: 0 },
      },
      take: Number(limit) || 10,
      orderBy: [
        { totalSold: 'desc' },
        { totalRevenue: 'desc' },
      ],
      select: {
        productId: true,
        name: true,
        slug: true,
        images: true,
        unit: true,
        buyPrice: true,
        price: true,
        stock: true,
        totalSold: true,
        totalRevenue: true,
        category: {
          select: {
            categoryId: true,
            name: true,
            emoji: true,
          },
        },
      },
    });

    return products;
  }

  /**
   * Inventory health report: low stock and out of stock items
   */
  async getStockHealth() {
    const [outOfStock, lowStock, totalActive] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isActive: true,
          stock: { lte: 0 },
        },
        select: {
          productId: true,
          name: true,
          slug: true,
          images: true,
          stock: true,
          unit: true,
          buyPrice: true,
          price: true,
          location: true,
          category: { select: { name: true, emoji: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),

      this.prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0, lte: 10 },
        },
        select: {
          productId: true,
          name: true,
          slug: true,
          images: true,
          stock: true,
          unit: true,
          buyPrice: true,
          price: true,
          location: true,
          category: { select: { name: true, emoji: true } },
        },
        orderBy: { stock: 'asc' },
      }),

      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    const healthyCount = Math.max(0, totalActive - (outOfStock.length + lowStock.length));

    return {
      totalActiveProducts: totalActive,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
      healthyCount,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
    };
  }

  /**
   * Recent orders snapshot
   */
  async getRecentOrders(limit = 10) {
    return this.prisma.order.findMany({
      take: Number(limit) || 10,
      orderBy: { createdAt: 'desc' },
      select: {
        orderId: true,
        orderNumber: true,
        totalAmount: true,
        subtotal: true,
        deliveryFee: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        createdAt: true,
        user: {
          select: {
            userId: true,
            name: true,
            phone: true,
          },
        },
        rider: {
          select: {
            riderId: true,
            user: { select: { name: true, phone: true } },
          },
        },
        _count: {
          select: { items: true },
        },
      },
    });
  }
}

