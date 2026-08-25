import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { Outlet } from '../../master/entities/outlet.entity';

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('pos_sessions')
export class PosSession extends BaseEntity {
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

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column({ name: 'opening_cash', type: 'decimal', precision: 14, scale: 2, default: 0 })
  openingCash: number;

  @Column({ name: 'closing_cash', type: 'decimal', precision: 14, scale: 2, nullable: true })
  closingCash?: number;

  @Column({ name: 'expected_cash', type: 'decimal', precision: 14, scale: 2, nullable: true })
  expectedCash?: number;

  @Column({ name: 'cash_difference', type: 'decimal', precision: 14, scale: 2, nullable: true })
  cashDifference?: number;

  @Column({ name: 'total_sales', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalSales: number;

  @Column({ name: 'total_transactions', default: 0 })
  totalTransactions: number;

  @Column({ name: 'total_cash_payments', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalCashPayments: number;

  @Column({ name: 'total_digital_payments', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalDigitalPayments: number;

  @Column({ name: 'total_void', default: 0 })
  totalVoid: number;

  @Column({ name: 'opened_at' })
  openedAt: Date;

  @Column({ name: 'closed_at', nullable: true })
  closedAt?: Date;

  @Column({ nullable: true })
  notes?: string;
}
