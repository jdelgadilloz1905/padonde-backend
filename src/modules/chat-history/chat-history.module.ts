import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { N8nChatHistory } from '../../entities/n8n-chat-history.entity';
import { ChatHistoryService } from './chat-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([N8nChatHistory])],
  providers: [ChatHistoryService],
  exports: [ChatHistoryService],
})
export class ChatHistoryModule {} 