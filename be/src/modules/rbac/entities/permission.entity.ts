import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AppModule as ModuleEntity } from './module.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ unique: true })
  slug: string; // Format: module:action, e.g., 'inventory:read'

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'module_id', nullable: true })
  moduleId?: string;

  @ManyToOne(() => ModuleEntity, { nullable: true })
  @JoinColumn({ name: 'module_id' })
  module?: ModuleEntity;
}
