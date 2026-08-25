import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from '../../master/entities/category.entity';

@Entity('products')
export class Product extends BaseEntity {
  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @Column({ type: 'jsonb', nullable: true })
  attributes?: Record<string, any>; // Dynamic attributes (weight, volume, etc.)

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  basePrice: number;

  @Column({ name: 'sell_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  sellPrice: number;

  @Column({ default: 'pcs' })
  unit: string;

  @Column({ name: 'min_stock', default: 0 })
  minStock: number;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
