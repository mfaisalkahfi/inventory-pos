import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Transaction } from './transaction.entity';
import { Outlet } from '../../master/entities/outlet.entity';
import { User } from '../../auth/entities/user.entity';

export enum ReturnStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REFUNDED = 'refunded',
}

@Entity('returns')
export class Return extends BaseEntity {
  @Column({ name: 'return_number', unique: true })
  returnNumber: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ name: 'outlet_id' })
  outletId: string;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: 'outlet_id' })
  outlet: Outlet;

  @Column({ name: 'processed_by' })
  processedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'processed_by' })
  processor: User;

  @Column()
  reason: string;

  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.PENDING })
  status: ReturnStatus;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ name: 'refund_method', nullable: true })
  refundMethod?: string; // cash, points, original_payment

  @OneToMany(() => ReturnItem, (item) => item.return, { cascade: true })
  items: ReturnItem[];
}

@Entity('return_items')
export class ReturnItem extends BaseEntity {
  @Column({ name: 'return_id' })
  returnId: string;

  @ManyToOne(() => Return, (r) => r.items)
  @JoinColumn({ name: 'return_id' })
  return: Return;

  @Column({ name: 'transaction_item_id' })
  transactionItemId: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ nullable: true })
  reason?: string;

  @Column({ name: 'return_to_stock', default: true })
  returnToStock: boolean;
}
