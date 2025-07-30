import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Driver } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Ride } from '../../entities/ride.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Client, Ride])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {} 