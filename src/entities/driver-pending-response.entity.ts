import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ride } from './ride.entity';
import { Driver  } from './driver.entity';

@Entity('driver-pending-response')
export class DriverPendingResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  driver_id: number;

  @Column({ unique: true })
  ride_id: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Driver, driver => driver.pending_rides)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Ride, ride => ride.pending_rides)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;
} 