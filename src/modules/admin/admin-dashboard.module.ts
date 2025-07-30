import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { Driver } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Ride } from '../../entities/ride.entity';
import { ScheduledRide } from 'src/entities/scheduled-ride.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Client, Ride, ScheduledRide])],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {} 