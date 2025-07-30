import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhoneNumbersService } from './phone-numbers.service';
import { PhoneNumbersController } from './phone-numbers.controller';
import { PhoneNumber } from '../../entities/phone-number.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PhoneNumber])],
  controllers: [PhoneNumbersController],
  providers: [PhoneNumbersService],
  exports: [PhoneNumbersService],
})
export class PhoneNumbersModule {} 