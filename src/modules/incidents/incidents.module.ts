import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { Incident } from '../../entities/incident.entity';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Incident]),
    DriversModule
  ],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {} 