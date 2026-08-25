import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Outlet } from '../../master/entities/outlet.entity';
import { User } from '../../auth/entities/user.entity';
import { Member } from './member.entity';
import { TransactionItem } from './transaction-item.entity';
import { Payment } from './payment.entity';

export enum TransactionStatus {
  OPEN = 'open',
  HOLD = 'hold',
  COMPLETED = 'completed',
  VOID = 'void',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'transaction_number', unique: true })
  transactionNumber: string;

  @Column({ name: 'outlet_id' })
  outletId: string;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: 'outlet_id' })
  outlet: Outlet;

  @Column({ name: 'cashier_id' })
  cashierId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @Column({ name: 'member_id', nullable: true })
  memberId?: string;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'member_id' })
  member?: Member;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.OPEN })
  status: TransactionStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus: PaymentStatus;

  @Column({ name: 'points_earned', type: 'decimal', precision: 10, scale: 2, default: 0 })
  pointsEarned: number;

  @Column({ name: 'points_redeemed', type: 'decimal', precision: 10, scale: 2, default: 0 })
  pointsRedeemed: number;

  @Column({ nullable: true })
  notes?: string;

  @OneToMany(() => TransactionItem, (item) => item.transaction, { cascade: true })
  items: TransactionItem[];

  @OneToMany(() => Payment, (payment) => payment.transaction, { cascade: true })
  payments: Payment[];
}
