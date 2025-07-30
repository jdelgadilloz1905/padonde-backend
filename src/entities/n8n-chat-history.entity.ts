import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('n8n_chat_histories')
export class N8nChatHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  session_id: string;

  @Column({ type: 'jsonb', nullable: true })
  message: any;
} 