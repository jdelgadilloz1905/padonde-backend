import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledRide } from 'src/entities/scheduled-ride.entity';
import { RecurringRide } from 'src/entities/recurring-ride.entity';
import { ScheduledRidesService } from './scheduled-rides.service';
import { ScheduledRidesController } from './scheduled-rides.controller';
import { Client } from 'src/entities/client.entity';
import { Driver } from 'src/entities/driver.entity';
import { User } from 'src/entities/user.entity';
import { Ride } from 'src/entities/ride.entity';
import { RidesModule } from '../rides/rides.module';
import { FareModule } from '../rides/fare.module';
import { WhatsAppNotificationService } from '../rides/whatsapp-notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledRide, RecurringRide, Client, Driver, User, Ride]),
    RidesModule,
    FareModule,
  ],
  controllers: [ScheduledRidesController],
  providers: [ScheduledRidesService, WhatsAppNotificationService],
  exports: [ScheduledRidesService],
})
export class ScheduledRidesModule {} 