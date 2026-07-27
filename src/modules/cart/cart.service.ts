import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: this.cartInclude(),
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: this.cartInclude(),
      });
    }
    return cart;
  }

  private cartInclude() {
    return {
      items: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          variant: true,
        },
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  private summarize(cart: any) {
    const items = cart.items.map((item: any) => {
      const unitPrice = item.variant ? Number(item.variant.price) : Number(item.product.price);
      return {
        ...item,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });
    const subtotal = items.reduce((sum: number, i: any) => sum + i.lineTotal, 0);
    return {
      ...cart,
      items,
      summary: {
        itemCount: items.reduce((s: number, i: any) => s + i.quantity, 0),
        subtotal,
      },
    };
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return { message: 'Cart retrieved', data: this.summarize(cart) };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null, status: 'ACTIVE' },
    });
    if (!product) throw new NotFoundException('Product not found or unavailable');

    let availableStock = product.stock;
    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId, isActive: true },
      });
      if (!variant) throw new NotFoundException('Variant not found');
      availableStock = variant.stock;
    }

    if (availableStock < dto.quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const cart = await this.getOrCreateCart(userId);
    const existing = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId || null,
      },
    });

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (availableStock < newQty) throw new BadRequestException('Insufficient stock');
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true, variant: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const stock = item.variant ? item.variant.stock : item.product.stock;
    if (stock < dto.quantity) throw new BadRequestException('Insufficient stock');

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared', data: null };
  }
}
