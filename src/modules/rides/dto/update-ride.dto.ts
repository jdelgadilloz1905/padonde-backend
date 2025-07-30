import { IsOptional, IsEnum, IsNumber, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RideStatus } from '../../../entities/ride.entity';

export class UpdateRideDto {
  @ApiProperty({ description: 'Dirección de origen', required: false })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({ description: 'Dirección de destino', required: false })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({ description: 'Estado de la carrera', enum: RideStatus, required: false })
  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;

  @ApiProperty({ description: 'ID de la conductora asignado', required: false })
  @IsOptional()
  @IsNumber()
  driver_id?: number;

  @ApiProperty({ description: 'Precio de la carrera', required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Distancia en kilómetros', required: false })
  @IsOptional()
  @IsNumber()
  distance?: number;

  @ApiProperty({ description: 'Duración estimada en minutos', required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Fecha de inicio del viaje', required: false })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiProperty({ description: 'Fecha de finalización del viaje', required: false })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiProperty({ description: 'Notas administrativas', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Número de pasajeros', example: 2, required: false, minimum: 1, maximum: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  @IsOptional()
  passenger_count?: number;

  @ApiProperty({ description: 'Si hay niños menores de 5 años', example: false, required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  has_children_under_5?: boolean;

  @ApiProperty({ description: 'Si es viaje de ida y vuelta', example: false, required: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  is_round_trip?: boolean;
}