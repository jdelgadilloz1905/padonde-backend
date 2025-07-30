import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FareService } from './fare.service';
import { FareController } from './fare.controller';
import { Zone } from '../../entities/zone.entity';
import { Client } from '../../entities/client.entity';
import { ZoneClient } from '../../entities/zone-client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Zone, Client, ZoneClient])],
  controllers: [FareController],
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {} 