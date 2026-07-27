import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const address = await this.prisma.address.create({
      data: { ...dto, userId },
    });
    return { message: 'Address created', data: address };
  }

  async findAll(userId: string) {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return { message: 'Addresses retrieved', data: addresses };
  }

  async findOne(userId: string, id: string) {
    const address = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!address) throw new NotFoundException('Address not found');
    return { message: 'Address retrieved', data: address };
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    await this.findOne(userId, id);
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    const address = await this.prisma.address.update({ where: { id }, data: dto });
    return { message: 'Address updated', data: address };
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.address.delete({ where: { id } });
    return { message: 'Address deleted', data: null };
  }
}
