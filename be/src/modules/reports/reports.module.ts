import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Product } from '../inventory/entities/product.entity';
import { ProductBatch } from '../inventory/entities/product-batch.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Transaction } from '../pos/entities/transaction.entity';
import { TransactionItem } from '../pos/entities/transaction-item.entity';
import { Payment } from '../pos/entities/payment.entity';
import { PurchaseOrder } from '../purchase-order/entities/purchase-order.entity';
import { PosSession } from '../pos/entities/pos-session.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product, ProductBatch, Inventory, StockMovement,
      Transaction, TransactionItem, Payment,
      PurchaseOrder, PosSession,
    ]),
    RbacModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
