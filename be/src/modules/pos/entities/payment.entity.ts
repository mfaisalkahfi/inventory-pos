import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Transaction } from './transaction.entity';

export enum PaymentMethod {
  CASH = 'cash',
  MIDTRANS = 'midtrans',
  POINTS = 'points',
}

export enum PaymentState {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment extends BaseEntity {
  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => Transaction, (t) => t.payments)
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;

  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentState, default: PaymentState.PENDING })
  status: PaymentState;

  @Column({ nullable: true })
  reference?: string; // Midtrans transaction ID, etc.

  @Column({ name: 'midtrans_data', type: 'jsonb', nullable: true })
  midtransData?: Record<string, any>;

  @Column({ name: 'change_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  changeAmount: number;
}
