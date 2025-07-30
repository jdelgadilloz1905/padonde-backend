import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Zone } from './zone.entity';
import { Client } from './client.entity';

@Entity('zone_clients')
export class ZoneClient {
  @PrimaryColumn({ comment: 'ID de la zona' })
  zone_id: number;

  @PrimaryColumn({ comment: 'ID del cliente' })
  client_id: number;

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2, 
    nullable: true, 
    comment: 'Tarifa especial para este cliente en esta zona específica' 
  })
  special_flat_rate?: number;

  @Column({ default: true, comment: 'Indica si la relación está activa' })
  active: boolean;

  @CreateDateColumn({ comment: 'Fecha de creación de la relación' })
  created_at: Date;

  // Relaciones con las entidades principales
  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;
} 