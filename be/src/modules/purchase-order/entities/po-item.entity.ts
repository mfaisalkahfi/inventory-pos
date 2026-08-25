import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../inventory/entities/product.entity';
import { ProductBatch } from '../../inventory/entities/product-batch.entity';

@Entity('po_items')
export class POItem extends BaseEntity {
  @Column({ name: 'po_id' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.items)
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => ProductBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: ProductBatch;

  @Column({ default: 0 })
  quantity: number;

  @Column({ name: 'received_quantity', default: 0 })
  receivedQuantity: number;

  @Column({ nullable: true })
  notes?: string;
}
