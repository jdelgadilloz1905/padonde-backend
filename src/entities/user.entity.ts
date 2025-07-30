import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  cognito_id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  role: 'admin' | 'operator';

  @Column({ nullable: true })
  profile_picture: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true, type: 'timestamp' })
  last_login: Date;

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true, type: 'timestamp' })
  resetPasswordExpires: Date;
} 