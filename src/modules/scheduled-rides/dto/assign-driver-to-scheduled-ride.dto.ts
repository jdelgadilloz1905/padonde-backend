import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AssignDriverToScheduledRideDto {
  @ApiProperty({ description: 'ID of the driver to assign' })
  @IsNumber()
  driver_id: number;
} 