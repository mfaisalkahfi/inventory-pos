import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';
import { ProductBatch } from './product-batch.entity';

export enum LocationType {
  WAREHOUSE = 'warehouse',
  OUTLET = 'outlet',
}

@Entity('inventory')
export class Inventory extends BaseEntity {
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

  @Column({ type: 'enum', enum: LocationType, name: 'location_type' })
  locationType: LocationType;

  @Column({ name: 'location_id' })
  locationId: string; // warehouse_id or outlet_id

  @Column({ default: 0 })
  quantity: number;
}
