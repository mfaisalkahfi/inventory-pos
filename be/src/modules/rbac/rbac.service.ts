import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { AppModule } from './entities/module.entity';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(AppModule)
    private readonly moduleRepository: Repository<AppModule>,
  ) {}

  // --- Roles ---
  async createRole(dto: CreateRoleDto) {
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Role name already exists');

    const role = this.roleRepository.create({ name: dto.name, description: dto.description });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionRepository.find({
        where: { id: In(dto.permissionIds) },
      });
    }

    return this.roleRepository.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permissionIds) {
      role.permissions = await this.permissionRepository.find({
        where: { id: In(dto.permissionIds) },
      });
    }

    return this.roleRepository.save(role);
  }

  async findAllRoles() {
    return this.roleRepository.find({ relations: { permissions: true } });
  }

  async findRoleById(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async deleteRole(id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    await this.roleRepository.softRemove(role);
    return { message: 'Role deleted' };
  }

  // --- Permissions ---
  async createPermission(dto: CreatePermissionDto) {
    const existing = await this.permissionRepository.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Permission slug already exists');

    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async findAllPermissions() {
    return this.permissionRepository.find({ relations: { module: true } });
  }

  async deletePermission(id: string) {
    const perm = await this.permissionRepository.findOne({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    await this.permissionRepository.softRemove(perm);
    return { message: 'Permission deleted' };
  }

  // --- User Roles ---
  async assignRole(dto: AssignRoleDto) {
    const existing = await this.userRoleRepository.findOne({
      where: { userId: dto.userId, roleId: dto.roleId },
    });
    if (existing) throw new ConflictException('Role already assigned to this user');

    const userRole = this.userRoleRepository.create({
      userId: dto.userId,
      roleId: dto.roleId,
    });
    return this.userRoleRepository.save(userRole);
  }

  async revokeRole(userId: string, roleId: string) {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });
    if (!userRole) throw new NotFoundException('User role assignment not found');
    await this.userRoleRepository.remove(userRole);
    return { message: 'Role revoked' };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: { role: { permissions: true } },
    });

    const permissions = new Set<string>();
    for (const ur of userRoles) {
      if (ur.role && ur.role.isActive) {
        for (const perm of ur.role.permissions) {
          permissions.add(perm.slug);
        }
      }
    }

    return Array.from(permissions);
  }

  // --- Modules / Menu ---
  async getMenuForUser(userId: string) {
    const userPermissions = await this.getUserPermissions(userId);

    const allModules = await this.moduleRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });

    // Filter modules by permission
    const accessibleModules = allModules.filter(
      (mod) =>
        !mod.requiredPermission || userPermissions.includes(mod.requiredPermission),
    );

    // Build tree
    return this.buildMenuTree(accessibleModules);
  }

  private buildMenuTree(modules: AppModule[], parentId?: string): any[] {
    return modules
      .filter((mod) => mod.parentId === (parentId || null))
      .map((mod) => ({
        id: mod.id,
        name: mod.name,
        icon: mod.icon,
        route: mod.route,
        sortOrder: mod.sortOrder,
        children: this.buildMenuTree(modules, mod.id),
      }));
  }
}
