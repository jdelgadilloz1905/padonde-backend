import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Client } from './client.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0.00 })
  price_per_minute: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  minimum_fare: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  night_rate_percentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weekend_rate_percentage: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.00 })
  commission_percentage: number;

  @Column({ type: 'geography', spatialFeatureType: 'Polygon' })
  area: any;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'decimal',  precision: 10, scale: 2, nullable: true, comment: 'Tarifa plana para toda la zona (ignora price_per_minute)' })
  flat_rate?: number;

  @Column({ 
    type: 'enum', 
    enum: ['flat_rate', 'minute_rate'], 
    nullable: true, 
    comment: 'Tipo de tarifa de zona: flat_rate (tarifa plana) o minute_rate (por minuto)' 
  })
  rate_type?: 'flat_rate' | 'minute_rate';

  @Column({ default: false, comment: 'Indica si la zona tiene clientes con tarifas especiales' })
  has_special_clients: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToMany(() => Client, client => client.specialZones)
  specialClients: Client[];
} 