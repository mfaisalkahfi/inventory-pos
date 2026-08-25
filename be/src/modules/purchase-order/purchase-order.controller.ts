import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto, ReceivePODto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @RequirePermission('po:create')
  @ApiOperation({ summary: 'Create purchase order' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: User) {
    return this.poService.createPO(dto, user.id);
  }

  @Get()
  @RequirePermission('po:read')
  @ApiOperation({ summary: 'Get all purchase orders' })
  findAll() {
    return this.poService.findAll();
  }

  @Get(':id')
  @RequirePermission('po:read')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  findById(@Param('id') id: string) {
    return this.poService.findById(id);
  }

  @Get('number/:poNumber')
  @RequirePermission('po:read')
  @ApiOperation({ summary: 'Get purchase order by PO number' })
  findByNumber(@Param('poNumber') poNumber: string) {
    return this.poService.findByPONumber(poNumber);
  }

  @Put(':id/submit')
  @RequirePermission('po:submit')
  @ApiOperation({ summary: 'Submit PO for review' })
  submit(@Param('id') id: string) {
    return this.poService.submitPO(id);
  }

  @Put(':id/ship')
  @RequirePermission('po:ship')
  @ApiOperation({ summary: 'Mark PO as shipped' })
  ship(@Param('id') id: string) {
    return this.poService.shipPO(id);
  }

  @Put(':id/receive')
  @RequirePermission('po:receive')
  @ApiOperation({ summary: 'Receive PO at outlet' })
  receive(@Param('id') id: string, @Body() dto: ReceivePODto, @CurrentUser() user: User) {
    return this.poService.receivePO(id, dto, user.id);
  }

  @Put(':id/approve')
  @RequirePermission('po:approve')
  @ApiOperation({ summary: 'Approve received PO' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.poService.approvePO(id, user.id);
  }
}
