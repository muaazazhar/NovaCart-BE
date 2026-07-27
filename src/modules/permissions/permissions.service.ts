import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Permission already exists');

    const permission = await this.prisma.permission.create({ data: dto });
    return { message: 'Permission created', data: permission };
  }

  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return { message: 'Permissions retrieved', data: permissions };
  }

  async findByModule(module: string) {
    const permissions = await this.prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
    return { message: 'Permissions retrieved', data: permissions };
  }

  async findOne(id: string) {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) throw new NotFoundException('Permission not found');
    return { message: 'Permission retrieved', data: permission };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.permission.delete({ where: { id } });
    return { message: 'Permission deleted', data: null };
  }
}
