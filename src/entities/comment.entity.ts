import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Ride } from './ride.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column('decimal', { precision: 2, scale: 1, nullable: true })
  rating: number;

  @ManyToOne(() => User, user => user.id, { eager: true })
  author: User;

  @Column()
  authorId: number;

  @ManyToOne(() => Ride, ride => ride.comments, { onDelete: 'CASCADE' })
  ride: Ride;

  @Column()
  rideId: number;

  @Column({ nullable: true })
  priority: string;

  @Column({ default: false })
  internal: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 