import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Driver } from './driver.entity';
import { Client } from './client.entity';
import { Ride } from './ride.entity';

export enum RatingType {
  DRIVER = 'driver',
  CLIENT = 'client',
}

@Entity('ratings')
@Unique(['ride', 'ratingType']) // Una calificación por carrera por tipo
export class Rating {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RatingType,
    name: 'rating_type',
  })
  ratingType: RatingType;

  @Column({ type: 'int' })
  score: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @Column({ name: 'ride_id' })
  rideId: number;

  @ManyToOne(() => Driver, (driver) => driver.receivedRatings)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Client, (client) => client.givenRatings)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Ride, (ride) => ride.ratings)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 