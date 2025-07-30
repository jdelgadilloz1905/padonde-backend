import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from '../../entities/client.entity';
import { Zone } from '../../entities/zone.entity';
import { ZoneClient } from '../../entities/zone-client.entity';
import { Ride } from '../../entities/ride.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Zone, ZoneClient, Ride]),
    ConfigModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService]
})
export class ClientsModule {} 