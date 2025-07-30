import { IsOptional, IsInt, Min, IsEnum, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class QueryDriversDto {
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

  @ApiProperty({ 
    description: 'Campo de ordenamiento', 
    example: 'id', 
    required: false,
    enum: ['id', 'first_name', 'last_name', 'phone_number', 'registration_date', 'average_rating', 'status']
  })
  @IsEnum(['id', 'first_name', 'last_name', 'phone_number', 'registration_date', 'average_rating', 'status'])
  @IsOptional()
  sort_by?: string = 'id';

  @ApiProperty({ 
    description: 'Dirección de ordenamiento', 
    example: 'ASC', 
    required: false,
    enum: ['ASC', 'DESC']
  })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  sort_order?: 'ASC' | 'DESC' = 'ASC';

  @ApiProperty({ description: 'Filtrar por estado', example: 'available', required: false, enum: ['available', 'busy', 'offline', 'on_the_way'] })
  @IsEnum(['available', 'busy', 'offline', 'on_the_way'])
  @IsOptional()
  status?: 'available' | 'busy' | 'offline' | 'on_the_way';

  @ApiProperty({ description: 'Filtrar por término de búsqueda (nombre o apellido)', example: 'Juan', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Filtrar solo conductoras activos', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  active?: boolean;

  @ApiProperty({ description: 'Filtrar solo conductoras verificados', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  verified?: boolean;
} 