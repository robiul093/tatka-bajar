import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto, EstimateCheckoutDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Central Warehouse / Distribution Hub Coordinates (Dhaka Central Hub)
export const CENTRAL_WAREHOUSE = {
  latitude: 23.7516,
  longitude: 90.3944,
};

export const DELIVERY_RULES = {
  BASE_FEE: 40, // BDT base fee within 3 km
  PER_KM_RATE: 10, // BDT per additional km beyond 3 km
  FREE_DELIVERY_THRESHOLD: 1000, // Free delivery if subtotal >= 1000 BDT
  DEFAULT_STANDARD_FEE: 50, // Default fee if coordinates are unavailable
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TB-${timestamp}-${random}`;
  }

  /**
   * Computes geographic distance in kilometers using the Haversine formula
   */
  public calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Calculates delivery fee based on order subtotal and customer coordinates
   */
  public calculateDeliveryFee(
    subtotal: number,
    lat?: number | null,
    lng?: number | null,
  ): { deliveryFee: number; distanceKm: number | null; freeDeliveryEligible: boolean } {
    // 1. Check if eligible for free delivery promotion
    if (subtotal >= DELIVERY_RULES.FREE_DELIVERY_THRESHOLD) {
      return {
        deliveryFee: 0,
        distanceKm:
          lat != null && lng != null
            ? this.calculateDistanceKm(
                CENTRAL_WAREHOUSE.latitude,
                CENTRAL_WAREHOUSE.longitude,
                lat,
                lng,
              )
            : null,
        freeDeliveryEligible: true,
      };
    }

    // 2. If coordinates are provided, compute distance-based fee
    if (lat != null && lng != null) {
      const distanceKm = this.calculateDistanceKm(
        CENTRAL_WAREHOUSE.latitude,
        CENTRAL_WAREHOUSE.longitude,
        lat,
        lng,
      );

      if (distanceKm <= 3) {
        return {
          deliveryFee: DELIVERY_RULES.BASE_FEE,
          distanceKm,
          freeDeliveryEligible: false,
        };
      }

      const extraKm = Math.ceil(distanceKm - 3);
      const computedFee = DELIVERY_RULES.BASE_FEE + extraKm * DELIVERY_RULES.PER_KM_RATE;

      return {
        deliveryFee: Number(computedFee.toFixed(2)),
        distanceKm,
        freeDeliveryEligible: false,
      };
    }

    // 3. Fallback standard delivery fee
    return {
      deliveryFee: DELIVERY_RULES.DEFAULT_STANDARD_FEE,
      distanceKm: null,
      freeDeliveryEligible: false,
    };
  }

  /**
   * Pre-checkout estimation: calculates subtotal, delivery fee, distance, and free delivery requirements
   */
  async estimateCheckout(userId: string, dto: EstimateCheckoutDto) {
    let itemsToProcess: { productId: string; quantity: number }[] = [];

    if (dto.fromCart) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Your shopping cart is empty');
      }

      itemsToProcess = cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
    } else {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Items must be provided to calculate estimate');
      }
      itemsToProcess = dto.items;
    }

    let subtotal = 0;
    let totalItems = 0;

    for (const item of itemsToProcess) {
      const product = await this.prisma.product.findUnique({
        where: { productId: item.productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundException(`Product not found or unavailable: ${item.productId}`);
      }

      const unitPrice =
        product.isDiscount && product.discountPrice
          ? product.discountPrice
          : product.price;

      subtotal += Number((unitPrice * item.quantity).toFixed(2));
      totalItems += item.quantity;
    }

    subtotal = Number(subtotal.toFixed(2));

    // Resolve coordinates from addressId if provided
    let userLat: number | null = null;
    let userLng: number | null = null;

    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { addressId: dto.addressId, userId },
      });
      if (address) {
        userLat = address.latitude;
        userLng = address.longitude;
      }
    }

    const { deliveryFee, distanceKm, freeDeliveryEligible } =
      this.calculateDeliveryFee(subtotal, userLat, userLng);

    const amountNeededForFreeDelivery =
      subtotal < DELIVERY_RULES.FREE_DELIVERY_THRESHOLD
        ? Number((DELIVERY_RULES.FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2))
        : 0;

    const estimatedTotal = Number((subtotal + deliveryFee).toFixed(2));

    return {
      subtotal,
      deliveryFee,
      discount: 0,
      estimatedTotal,
      distanceKm,
      freeDeliveryEligible,
      freeDeliveryThreshold: DELIVERY_RULES.FREE_DELIVERY_THRESHOLD,
      amountNeededForFreeDelivery,
      totalItems,
    };
  }

  async create(userId: string, dto: CreateOrderDto) {
    let orderItemsData: { productId: string; quantity: number }[] = [];

    if (dto.fromCart) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }

      orderItemsData = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
    } else {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Order items must be provided');
      }
      orderItemsData = dto.items;
    }

    // Validate address if provided and obtain coordinates
    let deliveryLat: number | null = null;
    let deliveryLng: number | null = null;

    if (dto.addressId) {
      const address = await this.prisma.address.findFirst({
        where: { addressId: dto.addressId, userId },
      });
      if (!address) {
        throw new NotFoundException('Delivery address not found');
      }
      deliveryLat = address.latitude;
      deliveryLng = address.longitude;
    }

    // Validate products and check live stock
    let subtotal = 0;
    const resolvedItems: {
      productId: string;
      productName: string;
      productImage: string | null;
      productPrice: number;
      buyPrice: number;
      quantity: number;
      totalPrice: number;
    }[] = [];

    for (const item of orderItemsData) {
      const product = await this.prisma.product.findUnique({
        where: { productId: item.productId },
      });

      if (!product || !product.isActive) {
        throw new NotFoundException(`Product not found or unavailable: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available stock: ${product.stock}`,
        );
      }

      // Use active discounted price if toggle is enabled
      const unitPrice =
        product.isDiscount && product.discountPrice
          ? product.discountPrice
          : product.price;

      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      subtotal += itemTotal;

      resolvedItems.push({
        productId: product.productId,
        productName: product.name,
        productImage: product.images?.[0] ?? null,
        productPrice: unitPrice,
        buyPrice: product.buyPrice,
        quantity: item.quantity,
        totalPrice: itemTotal,
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    // Dynamic delivery fee calculation
    let deliveryFee: number;
    if (dto.deliveryFee !== undefined && dto.deliveryFee !== null) {
      // If client supplied deliveryFee, respect it or check free delivery threshold
      deliveryFee =
        subtotal >= DELIVERY_RULES.FREE_DELIVERY_THRESHOLD
          ? 0
          : Number(dto.deliveryFee);
    } else {
      deliveryFee = this.calculateDeliveryFee(subtotal, deliveryLat, deliveryLng).deliveryFee;
    }

    const totalAmount = Number((subtotal + deliveryFee).toFixed(2));
    const orderNumber = this.generateOrderNumber();

    // Atomic transaction: create order + items, deduct stock, update analytics, clear cart
    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId: dto.addressId ?? null,
          subtotal,
          deliveryFee,
          discount: 0,
          totalAmount,
          deliveryLat,
          deliveryLng,
          paymentMethod: dto.paymentMethod ?? 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
          status: 'PENDING',
          deliveryNotes: dto.deliveryNotes,
          items: {
            create: resolvedItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { productId: true, name: true, images: true, unit: true },
              },
            },
          },
          address: true,
          user: {
            select: { userId: true, name: true, email: true, phone: true },
          },
        },
      });

      // Deduct stock and increment sales tracking per product
      for (const item of resolvedItems) {
        await tx.product.update({
          where: { productId: item.productId },
          data: {
            stock: { decrement: item.quantity },
            totalSold: { increment: item.quantity },
            totalRevenue: { increment: item.totalPrice },
          },
        });
      }

      // Clear cart items if checkout was from cart
      if (dto.fromCart) {
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.cartId } });
        }
      }

      return createdOrder;
    });

    // Asynchronously dispatch order confirmation email (non-blocking)
    if (order.user?.email) {
      this.mailService
        .sendOrderConfirmationEmail(
          order.user.email,
          order.orderNumber,
          order.totalAmount,
          order.items.length,
          order.user.name,
        )
        .catch((err) => {
          this.logger.warn(`Failed to dispatch confirmation email: ${err.message}`);
        });
    }

    return order;
  }

  async findUserOrders(userId: string, status?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              product: {
                select: { productId: true, name: true, images: true, unit: true },
              },
            },
          },
          address: true,
          rider: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findUserOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ orderId }, { orderNumber: orderId }],
        userId,
      },
      include: {
        items: {
          include: { product: true },
        },
        address: true,
        rider: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderId, userId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel order with status: ${order.status}. Only PENDING orders can be cancelled.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Restore stock and revert sales tracking
      for (const item of order.items) {
        await tx.product.update({
          where: { productId: item.productId },
          data: {
            stock: { increment: item.quantity },
            totalSold: { decrement: item.quantity },
            totalRevenue: { decrement: item.totalPrice },
          },
        });
      }

      return tx.order.update({
        where: { orderId },
        data: { status: 'CANCELLED' },
        include: {
          items: true,
          address: true,
        },
      });
    });
  }

  async findAllAdmin(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { userId: true, name: true, email: true, phone: true },
          },
          address: true,
          items: true,
          rider: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRiderOrders(userId: string, status?: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found for this user');
    }

    const where: any = { riderId: rider.riderId };
    if (status) {
      where.status = status.toUpperCase();
    }

    return this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: { userId: true, name: true, phone: true },
        },
        address: true,
        items: {
          include: {
            product: {
              select: { productId: true, name: true, images: true, unit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    currentUserId?: string,
    userRole?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // If RIDER is updating, ensure this order is assigned to them
    if (userRole === 'RIDER') {
      const rider = await this.prisma.rider.findUnique({
        where: { userId: currentUserId },
      });
      if (!rider || order.riderId !== rider.riderId) {
        throw new ForbiddenException('You can only update orders assigned to you');
      }
    }

    const data: any = { status: dto.status };

    if (dto.paymentStatus) {
      data.paymentStatus = dto.paymentStatus;
    }

    if (dto.status === 'DELIVERED') {
      data.deliveredAt = new Date();
      data.paymentStatus = 'PAID';

      // Update rider's total deliveries count
      if (order.riderId) {
        await this.prisma.rider.update({
          where: { riderId: order.riderId },
          data: { totalDeliveries: { increment: 1 } },
        });
      }
    }

    return this.prisma.order.update({
      where: { orderId },
      data,
      include: {
        items: true,
        address: true,
        rider: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });
  }

  async assignRider(orderId: string, riderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(`Cannot assign rider to a ${order.status} order`);
    }

    const rider = await this.prisma.rider.findUnique({
      where: { riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    if (!rider.isActive) {
      throw new BadRequestException('Cannot assign an inactive rider');
    }

    return this.prisma.order.update({
      where: { orderId },
      data: {
        riderId,
        status: 'PROCESSING',
      },
      include: {
        items: true,
        address: true,
        rider: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });
  }
}
