import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export enum DateRangeEnum {
  ALL = 'all',
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month'
}

export enum SortByEnum {
  DISTANCE = 'distance',
  AMOUNT = 'amount',
  DATE = 'date'
}

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc'
}

export class RideHistoryQueryDto {
  @ApiProperty({
    enum: DateRangeEnum,
    description: 'Rango de fechas para filtrar',
    required: false,
    default: DateRangeEnum.ALL
  })
  @IsEnum(DateRangeEnum)
  @IsOptional()
  dateRange?: DateRangeEnum = DateRangeEnum.ALL;

  @ApiProperty({
    description: 'Monto máximo para filtrar',
    required: false,
    type: Number
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @ApiProperty({
    description: 'Monto mínimo para filtrar',
    required: false,
    type: Number
  })
  @Transform(({ value }) => typeof value === 'string' ? parseFloat(value) : value)
  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @ApiProperty({
    enum: SortByEnum,
    description: 'Campo por el cual ordenar',
    required: false,
    default: SortByEnum.DATE
  })
  @IsEnum(SortByEnum)
  @IsOptional()
  sortBy?: SortByEnum = SortByEnum.DATE;

  @ApiProperty({
    enum: SortOrderEnum,
    description: 'Orden de clasificación',
    required: false,
    default: SortOrderEnum.DESC
  })
  @IsEnum(SortOrderEnum)
  @IsOptional()
  sortOrder?: SortOrderEnum = SortOrderEnum.DESC;

  @ApiProperty({
    description: 'Número de página (empieza en 1)',
    required: false,
    default: 1,
    minimum: 1
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de elementos por página',
    required: false,
    default: 10,
    minimum: 1
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
} 