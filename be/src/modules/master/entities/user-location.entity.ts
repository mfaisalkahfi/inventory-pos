import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum LocationType {
  WAREHOUSE = 'warehouse',
  OUTLET = 'outlet',
}

@Entity('user_locations')
export class UserLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: LocationType, name: 'location_type' })
  locationType: LocationType;

  @Column({ name: 'location_id' })
  locationId: string;
}
