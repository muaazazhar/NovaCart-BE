import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { generateSku } from '../../common/utils/slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVariantDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const count = await this.prisma.productVariant.count({ where: { productId: dto.productId } });
    const sku = dto.sku || generateSku(`${product.sku}-V`, count + 1);

    const variant = await this.prisma.productVariant.create({
      data: {
        ...dto,
        sku,
        attributes: dto.attributes as Prisma.InputJsonValue,
      },
    });
    return { message: 'Variant created', data: variant };
  }

  async findByProduct(productId: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return { message: 'Variants retrieved', data: variants };
  }

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');
    return { message: 'Variant retrieved', data: variant };
  }

  async update(id: string, dto: UpdateVariantDto) {
    await this.findOne(id);
    const variant = await this.prisma.productVariant.update({
      where: { id },
      data: {
        ...dto,
        attributes: dto.attributes as Prisma.InputJsonValue,
      },
    });
    return { message: 'Variant updated', data: variant };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.productVariant.delete({ where: { id } });
    return { message: 'Variant deleted', data: null };
  }
}
