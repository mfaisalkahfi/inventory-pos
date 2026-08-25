import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Warehouse } from '../../master/entities/warehouse.entity';
import { Outlet } from '../../master/entities/outlet.entity';
import { User } from '../../auth/entities/user.entity';
import { POItem } from './po-item.entity';

export enum POStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('purchase_orders')
export class PurchaseOrder extends BaseEntity {
  @Column({ name: 'po_number', unique: true })
  poNumber: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'outlet_id' })
  outletId: string;

  @ManyToOne(() => Outlet)
  @JoinColumn({ name: 'outlet_id' })
  outlet: Outlet;

  @Column({ type: 'enum', enum: POStatus, default: POStatus.DRAFT })
  status: POStatus;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'shipped_at', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'received_at', nullable: true })
  receivedAt?: Date;

  @Column({ nullable: true })
  notes?: string;

  @OneToMany(() => POItem, (item) => item.purchaseOrder, { cascade: true })
  items: POItem[];
}
