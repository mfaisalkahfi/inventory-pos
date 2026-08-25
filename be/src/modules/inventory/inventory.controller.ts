import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateBatchDto, StockInDto } from './dto/batch.dto';
import { LocationType } from './entities/inventory.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --- Products ---
  @Post('products')
  @RequirePermission('inventory:manage_products')
  @ApiOperation({ summary: 'Create product' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Get('products')
  @RequirePermission('inventory:read_products')
  @ApiOperation({ summary: 'Get all products' })
  findAllProducts() {
    return this.inventoryService.findAllProducts();
  }

  @Get('products/:id')
  @RequirePermission('inventory:read_products')
  @ApiOperation({ summary: 'Get product by ID' })
  findProductById(@Param('id') id: string) {
    return this.inventoryService.findProductById(id);
  }

  @Put('products/:id')
  @RequirePermission('inventory:manage_products')
  @ApiOperation({ summary: 'Update product' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @RequirePermission('inventory:manage_products')
  @ApiOperation({ summary: 'Delete product' })
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // --- Batches ---
  @Post('batches')
  @RequirePermission('inventory:manage_batches')
  @ApiOperation({ summary: 'Create batch for product' })
  createBatch(@Body() dto: CreateBatchDto) {
    return this.inventoryService.createBatch(dto);
  }

  @Get('batches/product/:productId')
  @RequirePermission('inventory:read_batches')
  @ApiOperation({ summary: 'Get batches by product' })
  findBatchesByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findBatchesByProduct(productId);
  }

  // --- Stock ---
  @Post('stock-in')
  @RequirePermission('inventory:stock_in')
  @ApiOperation({ summary: 'Stock in to warehouse' })
  stockIn(@Body() dto: StockInDto, @CurrentUser() user: User) {
    return this.inventoryService.stockIn(dto, user.id);
  }

  @Get('stock/:locationType/:locationId')
  @RequirePermission('inventory:read_stock')
  @ApiOperation({ summary: 'Get stock by location' })
  getStock(
    @Param('locationType') locationType: LocationType,
    @Param('locationId') locationId: string,
  ) {
    return this.inventoryService.getStockByLocation(locationType, locationId);
  }

  // --- Manual Expired Check ---
  @Post('check-expired')
  @RequirePermission('inventory:manage_batches')
  @ApiOperation({ summary: 'Manually trigger expired check' })
  checkExpired() {
    return this.inventoryService.checkExpiredBatches();
  }
}
