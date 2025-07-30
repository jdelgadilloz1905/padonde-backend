import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DriverLocation } from './driver-location.entity';
import { Ride } from './ride.entity';
import { DriverPendingResponse } from './driver-pending-response.entity';
import { Rating } from './rating.entity';
import { Commission } from './commission.entity';
import { Incident } from './incident.entity';

export enum DriverStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_THE_WAY = 'on_the_way'
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  phone_number: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  profile_picture: string;

  @Column({ nullable: true })
  profile_picture_url: string; // URL de CloudFront

  @Column({ nullable: true })
  profile_picture_s3_key: string; // Clave S3 para gestión interna

  @Column({ type: 'jsonb', nullable: true })
  additional_photos: {
    vehicle_photos: string[];
    vehicle_insurance: string[];
    vehicle_registration: string[];
    vehicle_inspection: string[];
    document_photos: string[];
    verification_photos: string[];
  };

  @Column({ type: 'timestamp', nullable: true })
  photos_updated_at: Date;

  @Column()
  vehicle: string;

  @Column({ nullable: true })
  model: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true, type: 'int' })
  year: number;

  @Column({ unique: true })
  license_plate: string;

  @Column({  nullable: true })
  driver_license: string;

  @Column({  nullable: true })
  id_document: string;
 

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.OFFLINE })
  status: DriverStatus;

  @Column({ type: 'geography', spatialFeatureType: 'Point', nullable: true })
  current_location: string;

  @Column({ type: 'timestamp', nullable: true })
  last_update: Date;

  @CreateDateColumn()
  registration_date: Date;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  average_rating: number;

  @Column({ default: true })
  active: boolean;

  @Column({ nullable: true })
  session_token: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: false, comment: 'Marca si es una cuenta demo para Apple TestFlight' })
  is_demo_account: boolean;

  @Column({ type: 'int', default: 4, comment: 'Capacidad máxima de pasajeros del vehículo' })
  max_passengers: number;

  @Column({ default: false, comment: 'Indica si el vehículo tiene silla para niños' })
  has_child_seat: boolean;

  @Column({ nullable: true })
  otp_code: string;

  @Column({ nullable: true })
  otp_expiry: Date;

  @OneToMany(() => DriverLocation, location => location.driver)
  locations: DriverLocation[];

  @OneToMany(() => Ride, ride => ride.driver)
  rides: Ride[];

  @OneToMany(() => DriverPendingResponse, pending_rides => pending_rides.driver)
  pending_rides: DriverPendingResponse[];

  @OneToMany(() => Rating, rating => rating.driver)
  receivedRatings: Rating[];

  @OneToMany(() => Commission, commission => commission.driver)
  commissions: Commission[];

  @OneToMany(() => Incident, incident => incident.driver)
  incidents: Incident[];
}