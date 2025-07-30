import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { DriverLocationService } from './driver-location.service';
import { DriverLocation } from '../../entities/driver-location.entity';
import { Driver } from '../../entities/driver.entity';
import { TrackingController } from './tracking.controller';
import { DriversModule } from '../drivers/drivers.module';
import { GeocodingService } from '../rides/geocoding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverLocation, Driver]),
    DriversModule,
  ],
  providers: [TrackingGateway, DriverLocationService, GeocodingService],
  controllers: [TrackingController],
  exports: [DriverLocationService]
})
export class TrackingModule {} 