import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Driver } from './driver.entity';
import { Ride } from './ride.entity';

@Entity('locations')
export class DriverLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  driver_id: number;

  @Column({ nullable: true })
  ride_id: number;

  @Column({ type: 'geography', spatialFeatureType: 'Point' })
  location: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  speed: number;

  @Column({ nullable: true, type: 'int' })
  direction: number;

  @ManyToOne(() => Driver, driver => driver.locations)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Ride, ride => ride.locations, { nullable: true })
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;
} 