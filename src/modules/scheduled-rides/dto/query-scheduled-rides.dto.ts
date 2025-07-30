import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledRideStatus } from 'src/entities/scheduled-ride.entity';

export class QueryScheduledRidesDto {
  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ScheduledRideStatus })
  @IsOptional()
  @IsEnum(ScheduledRideStatus)
  status?: ScheduledRideStatus;

  @ApiPropertyOptional({ description: 'Filter by driver ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  driver_id?: number;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  client_id?: number;

  @ApiPropertyOptional({ description: 'Start date for date range filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  end_date?: string;
  
  @ApiPropertyOptional({ description: 'Search term for client name, phone, or location' })
  @IsOptional()
  @IsString()
  search?: string;
} 