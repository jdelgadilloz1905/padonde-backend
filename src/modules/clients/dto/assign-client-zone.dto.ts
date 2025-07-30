import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignClientZoneDto {
  @ApiProperty({
    description: 'Tarifa especial para este cliente en esta zona específica (en moneda local)',
    example: 30.00,
    minimum: 0,
    maximum: 9999.99,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999.99)
  special_flat_rate?: number;
} 