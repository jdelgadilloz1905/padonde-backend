import { IsOptional, IsNumber, IsString, IsBoolean, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QueryClientsDto {
  @ApiProperty({
    description: 'Número de página (empezando en 1)',
    minimum: 1,
    default: 1,
    required: false,
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Número de elementos por página',
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
    example: 10
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Búsqueda por nombre, teléfono o email',
    required: false,
    example: 'Juan'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar por estado activo/inactivo',
    required: false,
    example: true
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active?: boolean;

  @ApiProperty({
    description: 'Ordenar por campo',
    enum: ['registration_date', 'first_name', 'last_name', 'phone_number'],
    default: 'registration_date',
    required: false,
    example: 'registration_date'
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'registration_date';

  @ApiProperty({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
    required: false,
    example: 'DESC'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({
    description: 'Fecha de registro desde (YYYY-MM-DD)',
    required: false,
    example: '2025-01-01'
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiProperty({
    description: 'Fecha de registro hasta (YYYY-MM-DD)',
    required: false,
    example: '2025-01-31'
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
} 