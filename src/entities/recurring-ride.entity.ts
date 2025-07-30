import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ScheduledRide } from './scheduled-ride.entity';

export enum RecurringType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('recurring_rides')
export class RecurringRide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: RecurringType,
  })
  type: RecurringType;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  end_date?: string;

  @Column({ type: 'simple-array', nullable: true })
  days_of_week?: number[]; // 0 for Sunday, 1 for Monday, etc.

  @OneToMany(() => ScheduledRide, scheduledRide => scheduledRide.recurring_ride)
  scheduled_rides: ScheduledRide[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 