import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_batches')
export class ProductBatch extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'batch_code', unique: true })
  batchCode: string;

  @Column({ name: 'production_date', type: 'date', nullable: true })
  productionDate?: Date;

  @Column({ name: 'expired_date', type: 'date' })
  expiredDate: Date;

  @Column({ name: 'initial_quantity', default: 0 })
  initialQuantity: number;

  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData?: string;

  @Column({ name: 'is_expired', default: false })
  isExpired: boolean;

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean;

  @Column({ nullable: true })
  notes?: string;
}
