import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RideStatus } from '../../../entities/ride.entity';

export class ChangeStatusDto {
  @ApiProperty({ description: 'Nuevo estado de la carrera', enum: RideStatus })
  @IsEnum(RideStatus)
  status: RideStatus;

  @ApiProperty({ description: 'Razón del cambio de estado', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
} 