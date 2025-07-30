import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { ScheduledRideTasksService } from './scheduled-ride-tasks.service';
import { NotificationsController } from './notifications.controller';
import { ScheduledRide } from '../../entities/scheduled-ride.entity';
import { Driver } from '../../entities/driver.entity';
import { Ride } from '../../entities/ride.entity';
import { Client } from '../../entities/client.entity';
import { TwilioModule } from '../twilio/twilio.module';
import { RidesModule } from '../rides/rides.module';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledRide, Driver, Ride, Client]),
    TwilioModule,
    RidesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ScheduledRideTasksService, WhatsAppNotificationService],
  exports: [NotificationsService],
})
export class NotificationsModule {} 