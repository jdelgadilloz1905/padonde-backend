import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Ride } from './ride.entity';
import { Rating } from './rating.entity';
import { Zone } from './zone.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ unique: true })
  phone_number: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  usual_address: string;

  @Column({ nullable: true })
  address_reference: string;

  @CreateDateColumn()
  registration_date: Date;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Tarifa plana personalizada para cliente VIP' })
  flat_rate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Tarifa por minuto personalizada para el cliente' })
  minute_rate?: number;

  @Column({ default: false, comment: 'Indica si el cliente es VIP con tarifas especiales' })
  is_vip: boolean;

  @Column({ 
    type: 'enum', 
    enum: ['flat_rate', 'minute_rate'], 
    nullable: true, 
    comment: 'Tipo de tarifa VIP a aplicar: flat_rate (tarifa plana) o minute_rate (por minuto)' 
  })
  vip_rate_type?: 'flat_rate' | 'minute_rate';

  @OneToMany(() => Ride, ride => ride.client)
  rides: Ride[];

  @OneToMany(() => Rating, rating => rating.client)
  givenRatings: Rating[];

  @ManyToMany(() => Zone, zone => zone.specialClients)
  @JoinTable({
    name: 'zone_clients',
    joinColumn: { name: 'client_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'zone_id', referencedColumnName: 'id' }
  })
  specialZones: Zone[];
} 