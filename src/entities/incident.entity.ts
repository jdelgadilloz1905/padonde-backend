import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Driver } from './driver.entity';
import { Ride } from './ride.entity';
import { IncidentType } from '../modules/incidents/dto/create-incident.dto';
import { IncidentStatus } from '../modules/incidents/dto/update-incident.dto';

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  driver_id: number;

  @Column({ nullable: true })
  ride_id: number;

  @Column({
    type: 'enum',
    enum: IncidentType,
    default: IncidentType.OTHER
  })
  incident_type: IncidentType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  location: string;

  @CreateDateColumn()
  report_date: Date;

  @Column({
    type: 'enum',
    enum: IncidentStatus,
    default: IncidentStatus.OPEN
  })
  status: IncidentStatus;

  @Column({ nullable: true })
  resolution_notes: string;

  @Column({ nullable: true, type: 'timestamp' })
  resolution_date: Date;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @ManyToOne(() => Ride, { nullable: true })
  @JoinColumn({ name: 'ride_id' })
  ride: Ride;
} 