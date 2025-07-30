import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { S3Service } from './s3.service';
import { DriverPhotosService } from './services/driver-photos.service';
import { Driver } from '../../entities/driver.entity';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Driver]),
    DriversModule, // Necesario para DriverAuthGuard en endpoints existentes
  ],
  controllers: [UploadsController],
  providers: [S3Service, DriverPhotosService],
  exports: [S3Service, DriverPhotosService]
})
export class UploadsModule {} 