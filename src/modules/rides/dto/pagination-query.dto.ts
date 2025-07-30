import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Número de elementos por página',
    example: 10,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Incluir elementos inactivos',
    example: false,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  inactive?: boolean = false;
}

export class RecentRidesQueryDto {
  @ApiProperty({
    description: 'Número máximo de registros a retornar',
    example: 10,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Fecha de inicio para filtrar (YYYY-MM-DD)',
    example: '2025-07-01',
    required: false
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Fecha de fin para filtrar (YYYY-MM-DD)',
    example: '2025-07-11',
    required: false
  })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({
    description: 'Término de búsqueda (dirección, código de seguimiento, etc)',
    example: '1407 Grand Blvd',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;
} 