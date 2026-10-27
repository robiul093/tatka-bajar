import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { cartId: cart.cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: { categoryId: true, name: true, slug: true, emoji: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let subtotal = 0;
    const items = (fullCart?.items || []).map((item) => {
      const product = item.product;
      // Use discounted price if discount toggle is active
      const activePrice =
        product.isDiscount && product.discountPrice
          ? product.discountPrice
          : product.price;
      const itemTotal = Number((activePrice * item.quantity).toFixed(2));
      subtotal += itemTotal;
      return {
        ...item,
        unitPrice: activePrice,
        totalPrice: itemTotal,
      };
    });

    return {
      cartId: cart.cartId,
      userId,
      totalItems: items.reduce((acc, item) => acc + item.quantity, 0),
      subtotal: Number(subtotal.toFixed(2)),
      items,
    };
  }

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { productId: dto.productId },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or currently unavailable');
    }

    if (product.stock <= 0) {
      throw new BadRequestException(`"${product.name}" is currently out of stock`);
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.cartId,
          productId: dto.productId,
        },
      },
    });

    const newQuantity = (existingItem?.quantity || 0) + dto.quantity;

    if (product.stock < newQuantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { cartItemId: existingItem.cartItemId },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.cartId,
          productId: dto.productId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemIdOrProductId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.cartId,
        OR: [
          { cartItemId: itemIdOrProductId },
          { productId: itemIdOrProductId },
        ],
      },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { cartItemId: item.cartItemId } });
    } else {
      if (item.product.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}`,
        );
      }

      await this.prisma.cartItem.update({
        where: { cartItemId: item.cartItemId },
        data: { quantity: dto.quantity },
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemIdOrProductId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.cartId,
        OR: [
          { cartItemId: itemIdOrProductId },
          { productId: itemIdOrProductId },
        ],
      },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { cartItemId: item.cartItemId } });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.cartId },
    });
    return this.getCart(userId);
  }
}
