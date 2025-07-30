import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { Rating } from '../../entities/rating.entity';
import { Driver } from '../../entities/driver.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rating, Driver])],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {} 