import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { RequestsController } from './requests.controller';
import { Ride } from '../../entities/ride.entity';
import { Driver } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { DriverPendingResponse } from '../../entities/driver-pending-response.entity';
import { GeocodingService } from './geocoding.service';
import { FareService } from './fare.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { ConfigModule } from '@nestjs/config';
import { ChatHistoryModule } from '../chat-history/chat-history.module';
import { Zone } from '../../entities/zone.entity';
import { ZoneClient } from '../../entities/zone-client.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Driver, DriverPendingResponse, Client, Zone, ZoneClient]),
    ConfigModule,
    ChatHistoryModule,
    TrackingModule,
  ],
  controllers: [RidesController, RequestsController],
  providers: [RidesService, FareService, GeocodingService, WhatsAppNotificationService],
  exports: [RidesService, FareService, WhatsAppNotificationService]
})
export class RidesModule {} 