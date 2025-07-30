import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum, IsDecimal, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateRideDto {
  @ApiProperty({ description: 'Número de teléfono del cliente', example: '+573178263741' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'Dirección de origen', example: 'Av. Principal 123' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ description: 'Dirección de destino', example: 'Calle Secundaria 456' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ description: 'Latitud de las coordenadas de origen', example: 19.43215 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  @IsNotEmpty()
  origin_latitude: number;

  @ApiProperty({ description: 'Longitud de las coordenadas de origen', example: -99.12345 })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  @IsNotEmpty()
  origin_longitude: number;

  @ApiProperty({ description: 'Método de pago', example: 'cash', required: false, enum: ['cash', 'card', 'mobile', 'other'] })
  @IsEnum(['cash', 'card', 'mobile', 'other'])
  @IsOptional()
  payment_method?: 'cash' | 'card' | 'mobile' | 'other';

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