import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Driver } from './driver.entity';
import { Ride } from './ride.entity';

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed'
}

export enum CommissionStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled'
}

@Entity('commissions')
export class Commission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  driver_id: number;

  @Column()
  ride_id: number;

  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.PERCENTAGE
  })
  type: CommissionType;

  @Column('decimal', { precision: 8, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 5, scale: 2 })
  rate: number; // Porcentaje o valor fijo

  @Column({
    type: 'enum',
    enum: CommissionStatus,
    default: CommissionStatus.PENDING
  })
  status: CommissionStatus;

  @Column({ nullable: true })
  payment_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Driver, driver => driver.commissions)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Ride, ride => ride.commissions)
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;
} 