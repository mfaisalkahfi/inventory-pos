import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum MemberTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

@Entity('members')
export class Member extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  points: number;

  @Column({ type: 'enum', enum: MemberTier, default: MemberTier.BRONZE })
  tier: MemberTier;

  @Column({ name: 'total_spending', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalSpending: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
