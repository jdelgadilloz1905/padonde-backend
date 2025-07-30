import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';
import { Ride } from '../../entities/ride.entity';
import { Driver } from '../../entities/driver.entity';
import { Client } from '../../entities/client.entity';
import { Commission } from '../../entities/commission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, Driver, Client, Commission])
  ],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService]
})
export class CommissionsModule {} 