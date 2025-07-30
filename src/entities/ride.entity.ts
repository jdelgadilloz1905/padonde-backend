import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { Client } from './client.entity';
import { Driver } from './driver.entity';
import { DriverLocation } from './driver-location.entity';
import { DriverPendingResponse } from './driver-pending-response.entity';
import { Rating } from './rating.entity';
import { Comment } from './comment.entity';
import { Commission } from './commission.entity';

export enum RideStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  ON_THE_WAY = 'on_the_way',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  client_id: number;

  @Column({ nullable: true })
  driver_id: number;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point' })
  origin_coordinates: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point' })
  destination_coordinates: string;

  @CreateDateColumn()
  request_date: Date;

  @Column({ nullable: true, type: 'timestamp' })
  assignment_date: Date;

  @Column({ nullable: true, type: 'timestamp' })
  start_date: Date;

  @Column({ nullable: true, type: 'timestamp' })
  end_date: Date;

  @Column({
    type: 'enum',
    enum: RideStatus,
    default: RideStatus.PENDING
  })
  status: RideStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_percentage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commission_amount: number;

  @Column({ default: 'cash' })
  payment_method: 'cash' | 'card' | 'mobile' | 'other';

  @Column({ nullable: true, type: 'int' })
  client_rating: number;

  @Column({ nullable: true, type: 'int' })
  driver_rating: number;

  @Column({ nullable: true })
  client_comment: string;

  @Column({ nullable: true })
  driver_comment: string;

  @Column({ type: 'int', default: 1 })
  passenger_count: number;

  @Column({ type: 'boolean', default: false })
  has_children_under_5: boolean;

  @Column({ type: 'boolean', default: false })
  is_round_trip: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  distance: number;

  @Column({ nullable: true, type: 'int' })
  duration: number;

  @Column({ nullable: true })
  canceled_by: 'client' | 'driver' | 'system' | 'admin';

  @Column({ nullable: true })
  cancellation_reason: string;

  @Column({ nullable: true, unique: true })
  tracking_code: string;

  @Column({ nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  cancellationComment: string;

  @Column({ nullable: true })
  cancelledBy: string;

  @Column({ nullable: true, type: 'timestamp' })
  cancelledAt: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Client, client => client.rides)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Driver, driver => driver.rides)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @OneToMany(() => DriverLocation, location => location.ride)
  locations: DriverLocation[];

  @OneToMany(() => DriverPendingResponse, pending_rides => pending_rides.ride)
  pending_rides: DriverPendingResponse[];

  @OneToMany(() => Rating, rating => rating.ride)
  ratings: Rating[];

  @OneToMany(() => Comment, comment => comment.ride)
  comments: Comment[];

  @OneToMany(() => Commission, commission => commission.ride)
  commissions: Commission[];
}