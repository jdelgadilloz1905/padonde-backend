import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cancellation_reasons')
export class CancellationReason {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  reason: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 50 })
  userType: string; // 'client' | 'driver' | 'both'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 