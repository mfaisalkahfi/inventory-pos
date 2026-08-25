import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('modules')
export class AppModule extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  route?: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne(() => AppModule, (module) => module.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: AppModule;

  @OneToMany(() => AppModule, (module) => module.parent)
  children?: AppModule[];

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'required_permission', nullable: true })
  requiredPermission?: string; // e.g., 'inventory:read'
}
