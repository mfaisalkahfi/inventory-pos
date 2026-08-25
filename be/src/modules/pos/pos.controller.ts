import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateTransactionDto, ProcessPaymentDto } from './dto/transaction.dto';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { CreateReturnDto } from './dto/return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';

@ApiTags('POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  // --- Members ---
  @Post('members')
  @RequirePermission('pos:manage_members')
  @ApiOperation({ summary: 'Create member' })
  createMember(@Body() dto: CreateMemberDto) {
    return this.posService.createMember(dto);
  }

  @Get('members/phone/:phone')
  @RequirePermission('pos:read_members')
  @ApiOperation({ summary: 'Find member by phone' })
  findMemberByPhone(@Param('phone') phone: string) {
    return this.posService.findMemberByPhone(phone);
  }

  @Get('members/:id')
  @RequirePermission('pos:read_members')
  @ApiOperation({ summary: 'Get member by ID' })
  findMemberById(@Param('id') id: string) {
    return this.posService.findMemberById(id);
  }

  @Put('members/:id')
  @RequirePermission('pos:manage_members')
  @ApiOperation({ summary: 'Update member' })
  updateMember(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.posService.updateMember(id, dto);
  }

  // --- Transactions ---
  @Post('transactions')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Create transaction (add items to cart)' })
  createTransaction(@Body() dto: CreateTransactionDto, @CurrentUser() user: User) {
    return this.posService.createTransaction(dto, user.id);
  }

  @Get('transactions/:id')
  @RequirePermission('pos:read_transactions')
  @ApiOperation({ summary: 'Get transaction by ID' })
  findTransactionById(@Param('id') id: string) {
    return this.posService.findTransactionById(id);
  }

  @Put('transactions/:id/hold')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Hold transaction' })
  holdTransaction(@Param('id') id: string) {
    return this.posService.holdTransaction(id);
  }

  @Put('transactions/:id/recall')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Recall held transaction' })
  recallTransaction(@Param('id') id: string) {
    return this.posService.recallTransaction(id);
  }

  @Put('transactions/:id/void')
  @RequirePermission('pos:void_transaction')
  @ApiOperation({ summary: 'Void transaction' })
  voidTransaction(@Param('id') id: string) {
    return this.posService.voidTransaction(id);
  }

  // --- Payment ---
  @Post('payment')
  @RequirePermission('pos:process_payment')
  @ApiOperation({ summary: 'Process payment (supports split payment)' })
  processPayment(@Body() dto: ProcessPaymentDto, @CurrentUser() user: User) {
    return this.posService.processPayment(dto, user.id);
  }

  // --- Product Search (for POS cashier) ---
  @Get('products/search')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Search products for POS (cashier accessible)' })
  searchProducts(@Query('q') query: string, @Query('outletId') outletId?: string) {
    return this.posService.searchProducts(query, outletId);
  }

  // --- Sessions ---
  @Post('sessions/start')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Start POS session (start of day)' })
  startSession(@Body() dto: any, @CurrentUser() user: User) {
    return this.posService.startSession(dto, user.id);
  }

  @Put('sessions/:id/close')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Close POS session (end of day)' })
  closeSession(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: User) {
    return this.posService.closeSession(id, dto, user.id);
  }

  @Get('sessions/active')
  @RequirePermission('pos:create_transaction')
  @ApiOperation({ summary: 'Get active session for current user' })
  getActiveSession(@CurrentUser() user: User) {
    return this.posService.getActiveSession(user.id);
  }

  @Get('sessions/:id')
  @RequirePermission('pos:read_transactions')
  @ApiOperation({ summary: 'Get session by ID' })
  getSessionById(@Param('id') id: string) {
    return this.posService.getSessionById(id);
  }

  // --- Daily Report ---
  @Get('report/daily/:outletId')
  @RequirePermission('pos:read_transactions')
  @ApiOperation({ summary: 'Get daily report for outlet' })
  getDailyReport(@Param('outletId') outletId: string, @Query('date') date: string) {
    return this.posService.getDailyReport(outletId, date || new Date().toISOString().slice(0, 10));
  }

  @Get('sessions/outlet/:outletId')
  @RequirePermission('pos:read_transactions')
  @ApiOperation({ summary: 'Get sessions for outlet by date' })
  getSessionsByOutlet(@Param('outletId') outletId: string, @Query('date') date?: string) {
    return this.posService.getSessionsByOutlet(outletId, date);
  }
}
