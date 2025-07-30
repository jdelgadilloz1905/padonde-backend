import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CommissionQueryDto {
  @ApiProperty({ description: 'Número de página', example: 1, required: false, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: 'Elementos por página', example: 10, required: false, default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: 'Fecha de inicio (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ description: 'Fecha de fin (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  end_date?: string;

  @ApiProperty({ description: 'ID de la conductora específico', required: false })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  driver_id?: number;

  @ApiProperty({ description: 'Nombre de la conductora para búsqueda', required: false })
  @IsOptional()
  driver_name?: string;
} 