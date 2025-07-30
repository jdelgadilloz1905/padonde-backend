import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { Driver } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Ride } from '../../entities/ride.entity';
import { DriverLocation } from '../../entities/driver-location.entity';
import { DriverPendingResponse } from '../../entities/driver-pending-response.entity';
import { Incident } from '../../entities/incident.entity';
import { ScheduledRide } from '../../entities/scheduled-ride.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';
import { S3Service } from '../uploads/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver, 
      Client, 
      Ride, 
      DriverLocation, 
      DriverPendingResponse,
      Incident,
      ScheduledRide
    ]),
    TwilioModule,
    ChatHistoryModule,
  ],
  controllers: [DriversController],
  providers: [
    DriversService, 
    WhatsAppNotificationService,
    S3Service
  ],
  exports: [DriversService],
})
export class DriversModule {} 