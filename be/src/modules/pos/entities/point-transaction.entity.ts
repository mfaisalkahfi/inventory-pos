import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Member } from './member.entity';

export enum PointTransactionType {
  EARN = 'earn',
  REDEEM = 'redeem',
  ADJUSTMENT = 'adjustment',
  EXPIRED = 'expired',
}

@Entity('point_transactions')
export class PointTransaction extends BaseEntity {
  @Column({ name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  points: number;

  @Column({ type: 'enum', enum: PointTransactionType })
  type: PointTransactionType;

  @Column({ nullable: true })
  description?: string;
}
