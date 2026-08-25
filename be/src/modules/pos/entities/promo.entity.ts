import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PromoType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  BUNDLE = 'bundle',
}

export enum DiscountTarget {
  ITEM = 'item',
  TRANSACTION = 'transaction',
}

@Entity('promos')
export class Promo extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  code?: string; // Promo code (optional for auto-apply)

  @Column({ type: 'enum', enum: PromoType })
  type: PromoType;

  @Column({ name: 'discount_target', type: 'enum', enum: DiscountTarget, default: DiscountTarget.TRANSACTION })
  discountTarget: DiscountTarget;

  @Column({ name: 'discount_value', type: 'decimal', precision: 12, scale: 2 })
  discountValue: number;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount?: number;

  @Column({ name: 'min_purchase', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minPurchase: number;

  @Column({ type: 'jsonb', nullable: true })
  rules?: Record<string, any>; // product_ids, category_ids, member_only, etc.

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'auto_apply', default: false })
  autoApply: boolean;
}
