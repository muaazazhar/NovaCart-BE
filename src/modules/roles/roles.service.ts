import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Role already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        rolePermissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });

    return { message: 'Role created', data: role };
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { message: 'Roles retrieved', data: roles };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return { message: 'Role retrieved', data: role };
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);
    const role = await this.prisma.role.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        description: dto.description,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return { message: 'Role updated', data: role };
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto) {
    await this.findOne(id);
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.rolePermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      skipDuplicates: true,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.data.isSystem) {
      throw new ConflictException('System roles cannot be deleted');
    }
    const users = await this.prisma.user.count({ where: { roleId: id } });
    if (users > 0) {
      throw new ConflictException('Role has assigned users');
    }
    await this.prisma.role.delete({ where: { id } });
    return { message: 'Role deleted', data: null };
  }
}
