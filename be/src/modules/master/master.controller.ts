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
import { MasterService } from './master.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { CreateOutletDto, UpdateOutletDto } from './dto/outlet.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Master Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  // --- Warehouses ---
  @Post('warehouses')
  @RequirePermission('master:manage_warehouses')
  @ApiOperation({ summary: 'Create warehouse' })
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.masterService.createWarehouse(dto);
  }

  @Get('warehouses')
  @RequirePermission('master:read_warehouses')
  @ApiOperation({ summary: 'Get all warehouses' })
  findAllWarehouses() {
    return this.masterService.findAllWarehouses();
  }

  @Get('warehouses/:id')
  @RequirePermission('master:read_warehouses')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  findWarehouseById(@Param('id') id: string) {
    return this.masterService.findWarehouseById(id);
  }

  @Put('warehouses/:id')
  @RequirePermission('master:manage_warehouses')
  @ApiOperation({ summary: 'Update warehouse' })
  updateWarehouse(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.masterService.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  @RequirePermission('master:manage_warehouses')
  @ApiOperation({ summary: 'Delete warehouse' })
  deleteWarehouse(@Param('id') id: string) {
    return this.masterService.deleteWarehouse(id);
  }

  // --- Outlets ---
  @Post('outlets')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Create outlet' })
  createOutlet(@Body() dto: CreateOutletDto) {
    return this.masterService.createOutlet(dto);
  }

  @Get('outlets')
  @RequirePermission('master:read_outlets')
  @ApiOperation({ summary: 'Get all outlets' })
  findAllOutlets() {
    return this.masterService.findAllOutlets();
  }

  @Get('outlets/:id')
  @RequirePermission('master:read_outlets')
  @ApiOperation({ summary: 'Get outlet by ID' })
  findOutletById(@Param('id') id: string) {
    return this.masterService.findOutletById(id);
  }

  @Put('outlets/:id')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Update outlet' })
  updateOutlet(@Param('id') id: string, @Body() dto: UpdateOutletDto) {
    return this.masterService.updateOutlet(id, dto);
  }

  @Delete('outlets/:id')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Delete outlet' })
  deleteOutlet(@Param('id') id: string) {
    return this.masterService.deleteOutlet(id);
  }

  // --- Categories ---
  @Post('categories')
  @RequirePermission('master:manage_categories')
  @ApiOperation({ summary: 'Create category' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.masterService.createCategory(dto);
  }

  @Get('categories')
  @RequirePermission('master:read_categories')
  @ApiOperation({ summary: 'Get all categories (tree)' })
  findAllCategories() {
    return this.masterService.findAllCategories();
  }

  @Get('categories/:id')
  @RequirePermission('master:read_categories')
  @ApiOperation({ summary: 'Get category by ID' })
  findCategoryById(@Param('id') id: string) {
    return this.masterService.findCategoryById(id);
  }

  @Put('categories/:id')
  @RequirePermission('master:manage_categories')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.masterService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermission('master:manage_categories')
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Param('id') id: string) {
    return this.masterService.deleteCategory(id);
  }

  // --- User Location Assignment ---
  @Post('user-locations')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Assign user to location (warehouse/outlet)' })
  assignUserLocation(@Body() dto: { userId: string; locationType: string; locationId: string }) {
    return this.masterService.assignUserLocation(dto.userId, dto.locationType as any, dto.locationId);
  }

  @Get('user-locations/:userId')
  @RequirePermission('master:read_outlets')
  @ApiOperation({ summary: 'Get user location assignments' })
  getUserLocations(@Param('userId') userId: string) {
    return this.masterService.getUserLocations(userId);
  }

  @Delete('user-locations/:id')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Remove user location assignment' })
  removeUserLocation(@Param('id') id: string) {
    return this.masterService.removeUserLocation(id);
  }

  // --- Company Settings ---
  @Get('company')
  @Public()
  @ApiOperation({ summary: 'Get company settings (public)' })
  getCompanySettings() {
    return this.masterService.getCompanySettings();
  }

  @Put('company')
  @RequirePermission('master:manage_outlets')
  @ApiOperation({ summary: 'Update company settings (logo, name, address, etc.)' })
  updateCompanySettings(@Body() dto: any) {
    return this.masterService.upsertCompanySettings(dto);
  }
}
