import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('phone_numbers')
export class PhoneNumber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: 'Número telefónico en formato internacional' })
  phone_number: string;

  @CreateDateColumn()
  created_at: Date;
} 