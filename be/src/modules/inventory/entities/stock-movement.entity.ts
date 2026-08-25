import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';

export enum MovementType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  SALE = 'sale',
  RETURN = 'return',
  EXPIRED_WRITE_OFF = 'expired_write_off',
}

@Entity('stock_movements')
export class StockMovement extends BaseEntity {
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

  @Column({ type: 'enum', enum: MovementType, name: 'movement_type' })
  movementType: MovementType;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'from_location_type', nullable: true })
  fromLocationType?: string;

  @Column({ name: 'from_location_id', nullable: true })
  fromLocationId?: string;

  @Column({ name: 'to_location_type', nullable: true })
  toLocationType?: string;

  @Column({ name: 'to_location_id', nullable: true })
  toLocationId?: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string; // 'purchase_order', 'transaction', etc.

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ nullable: true })
  notes?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;
}
