import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsJSON } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateZoneDto {
  constructor(data: Partial<CreateZoneDto>) {
    Object.assign(this, data);
  }

  @ApiProperty({ description: 'Nombre de la zona' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Precio por minuto de viaje',
    example: 5.00,
    minimum: 0,
    maximum: 999.99
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  price_per_minute: number;

  @ApiProperty({ 
    description: 'Tarifa mínima de la zona',
    example: 50.00,
    minimum: 0,
    maximum: 999.99
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  minimum_fare: number;

  @ApiProperty({ 
    description: 'Porcentaje de recargo por servicio nocturno',
    example: 25.00,
    minimum: 0,
    maximum: 100
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  night_rate_percentage: number;

  @ApiProperty({ 
    description: 'Porcentaje de recargo por servicio en fin de semana',
    example: 25.00,
    minimum: 0,
    maximum: 100
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weekend_rate_percentage: number;

  @ApiProperty({ 
    description: 'Porcentaje de comisión de la zona',
    default: 10.00,
    minimum: 0,
    maximum: 100
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  commission_percentage?: number = 10.00;

  @ApiProperty({ 
    description: 'Área de la zona en formato GeoJSON Polygon',
    example: {
      type: 'Polygon',
      coordinates: [[
        [-99.12345, 19.43215],
        [-99.12346, 19.43216],
        [-99.12347, 19.43217],
        [-99.12345, 19.43215]
      ]]
    }
  })
  @Transform(({ value }) => typeof value === 'object' ? JSON.stringify(value) : value)
  @IsJSON()
  area: string;

  @ApiProperty({ 
    description: 'Tarifa plana para toda la zona (ignora price_per_minute)',
    example: 25.00,
    minimum: 0,
    maximum: 999.99,
    required: false 
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  @IsOptional()
  flat_rate?: number;

  @ApiProperty({ 
    description: 'Tipo de tarifa de zona: flat_rate (tarifa plana) o minute_rate (por minuto)', 
    enum: ['flat_rate', 'minute_rate'],
    example: 'minute_rate',
    required: false 
  })
  @IsString()
  @IsOptional()
  rate_type?: 'flat_rate' | 'minute_rate';

  @ApiProperty({ description: 'Estado de la zona', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ description: 'Descripción de la zona', required: false })
  @IsString()
  @IsOptional()
  description?: string;
} 