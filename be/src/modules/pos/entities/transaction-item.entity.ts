import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Transaction } from './transaction.entity';
import { Product } from '../../inventory/entities/product.entity';
import { ProductBatch } from '../../inventory/entities/product-batch.entity';

@Entity('transaction_items')
export class TransactionItem extends BaseEntity {
  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction, (t) => t.items)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'batch_id', nullable: true })
  batchId?: string;

  @ManyToOne(() => ProductBatch, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch?: ProductBatch;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;
}
