import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Client } from './client.entity';
import { Driver } from './driver.entity';
import { User } from './user.entity';
import { Ride } from './ride.entity';
import { RecurringRide } from './recurring-ride.entity';

export enum ScheduledRideStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ScheduledRidePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('scheduled_rides')
export class ScheduledRide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  client_id?: number;

  @ManyToOne(() => Client, { nullable: true, eager: true })
  @JoinColumn({ name: 'client_id' })
  client?: Client;

  @Column()
  client_name: string;

  @Column()
  client_phone: string;

  @Column({ nullable: true })
  driver_id?: number;

  @ManyToOne(() => Driver, { nullable: true, eager: true })
  @JoinColumn({ name: 'driver_id' })
  driver?: Driver;

  @Column()
  pickup_location: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  pickup_coordinates: string;

  @Column()
  destination: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  destination_coordinates: string;

  @Column({ type: 'timestamp with time zone' })
  scheduled_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_duration: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_cost: number;

  @Column({
    type: 'enum',
    enum: ScheduledRideStatus,
    default: ScheduledRideStatus.PENDING,
  })
  status: ScheduledRideStatus;

  @Column({
    type: 'enum',
    enum: ScheduledRidePriority,
    default: ScheduledRidePriority.NORMAL,
  })
  priority: ScheduledRidePriority;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ nullable: true })
  created_by_id?: number;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User;
  
  @Column({ nullable: true })
  ride_id?: number;

  @OneToOne(() => Ride, { nullable: true })
  @JoinColumn({ name: 'ride_id' })
  ride?: Ride;

  @Column({ nullable: true })
  recurring_ride_id?: number;

  @ManyToOne(() => RecurringRide, recurringRide => recurringRide.scheduled_rides, { nullable: true })
  @JoinColumn({ name: 'recurring_ride_id' })
  recurring_ride?: RecurringRide;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  recurrent_price?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 