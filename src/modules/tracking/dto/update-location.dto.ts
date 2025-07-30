import { IsNumber, IsOptional, IsPositive, Max, Min, ValidateNested, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class LocationCoordinatesDto {
  @ApiProperty({ 
    description: 'Latitud en grados decimales', 
    example: 19.4326
  })
  @IsNumber()
  lat: number;

  @ApiProperty({ 
    description: 'Longitud en grados decimales', 
    example: -99.1332
  })
  @IsNumber()
  lng: number;

  @ApiPropertyOptional({ 
    description: 'Marca de tiempo en milisegundos', 
    example: 1747331611175
  })
  @IsNumber()
  @IsOptional()
  timestamp?: number;
}

/**
 * DTO para la actualización de ubicación de un conductora
 * 
 * Soporta dos formatos:
 * 
 * 1. Formato completo:
 * {
 *   "latitude": 10.4870749,
 *   "longitude": -66.8558558,
 *   "speed": 35.5,
 *   "direction": 90,
 *   "rideId": 1
 * }
 * 
 * 2. Formato con objeto location:
 * {
 *   "driverId": 1,
 *   "location": {
 *     "lat": 10.4870749,
 *     "lng": -66.8558558,
 *     "timestamp": 1747331611175
 *   }
 * }
 */
export class UpdateLocationDto {
  @ApiProperty({ 
    description: 'Latitud en grados decimales', 
    example: 19.4326,
    minimum: -90,
    maximum: 90,
    required: false
  })
  @IsNumber()
  @Transform(({ value }) => {
    console.log('value', value);
    return parseFloat(value);
  })
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiProperty({ 
    description: 'Longitud en grados decimales', 
    example: -99.1332,
    minimum: -180,
    maximum: 180,
    required: false
  })
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ 
    description: 'Velocidad en km/h', 
    example: 35.5
  })
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  @IsPositive()
  speed?: number;

  @ApiPropertyOptional({ 
    description: 'Dirección en grados (0-359)', 
    example: 90,
    minimum: 0,
    maximum: 359
  })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @Min(0)
  @Max(359)
  direction?: number;

  @ApiPropertyOptional({ 
    description: 'ID del viaje asociado', 
    example: 1
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsPositive()
  @IsOptional()
  rideId?: number;

  // Formato alternativo - para compatibilidad con clientes existentes
  @ApiPropertyOptional({ 
    description: 'ID de la conductora (se ignora y se usa el conductora autenticado)', 
    example: 1
  })
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @IsOptional()
  driverId?: number;

  @ApiPropertyOptional({ 
    description: 'Objeto de ubicación (formato alternativo)', 
    example: { lat: 10.4870749, lng: -66.8558558, timestamp: 1747331611175 },
    type: LocationCoordinatesDto
  })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  @IsOptional()
  location?: LocationCoordinatesDto;
} 