import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermission } from './decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // --- Roles ---
  @Post('roles')
  @RequirePermission('rbac:manage_roles')
  @ApiOperation({ summary: 'Create a new role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles')
  @RequirePermission('rbac:read_roles')
  @ApiOperation({ summary: 'Get all roles' })
  findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('roles/:id')
  @RequirePermission('rbac:read_roles')
  @ApiOperation({ summary: 'Get role by ID' })
  findRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Put('roles/:id')
  @RequirePermission('rbac:manage_roles')
  @ApiOperation({ summary: 'Update a role' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @RequirePermission('rbac:manage_roles')
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // --- Permissions ---
  @Post('permissions')
  @RequirePermission('rbac:manage_permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Get('permissions')
  @RequirePermission('rbac:read_permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Delete('permissions/:id')
  @RequirePermission('rbac:manage_permissions')
  @ApiOperation({ summary: 'Delete a permission' })
  deletePermission(@Param('id') id: string) {
    return this.rbacService.deletePermission(id);
  }

  // --- User-Role assignment ---
  @Post('assign')
  @RequirePermission('rbac:assign_roles')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(@Body() dto: AssignRoleDto) {
    return this.rbacService.assignRole(dto);
  }

  @Delete('revoke/:userId/:roleId')
  @RequirePermission('rbac:assign_roles')
  @ApiOperation({ summary: 'Revoke role from user' })
  revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rbacService.revokeRole(userId, roleId);
  }

  // --- Menu ---
  @Get('menu')
  @ApiOperation({ summary: 'Get menu tree for current user' })
  getMenu(@CurrentUser() user: User) {
    return this.rbacService.getMenuForUser(user.id);
  }
}
