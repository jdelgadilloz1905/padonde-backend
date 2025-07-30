import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancellationsService } from './cancellations.service';
import { CancellationsController } from './cancellations.controller';
import { CancellationReason } from '../../entities/cancellation-reason.entity';
import { Ride } from '../../entities/ride.entity';
import { ChatHistoryModule } from '../chat-history/chat-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CancellationReason, Ride]),
    ChatHistoryModule
  ],
  controllers: [CancellationsController],
  providers: [CancellationsService],
  exports: [CancellationsService],
})
export class CancellationsModule {} 