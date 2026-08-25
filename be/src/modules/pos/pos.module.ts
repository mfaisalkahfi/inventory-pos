import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionItem } from './entities/transaction-item.entity';
import { Payment } from './entities/payment.entity';
import { Member } from './entities/member.entity';
import { PointTransaction } from './entities/point-transaction.entity';
import { Promo } from './entities/promo.entity';
import { Return, ReturnItem } from './entities/return.entity';
import { PosSession } from './entities/pos-session.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Product } from '../inventory/entities/product.entity';
import { ProductBatch } from '../inventory/entities/product-batch.entity';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      Payment,
      Member,
      PointTransaction,
      Promo,
      Return,
      ReturnItem,
      PosSession,
      Inventory,
      StockMovement,
      Product,
      ProductBatch,
    ]),
    RbacModule,
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
