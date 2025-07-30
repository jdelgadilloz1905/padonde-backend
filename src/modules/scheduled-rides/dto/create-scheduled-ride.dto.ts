import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ScheduledRidePriority } from 'src/entities/scheduled-ride.entity';

class CoordinatesDto {
  @ApiProperty()
  @IsNumber()
  lat: number;

  @ApiProperty()
  @IsNumber()
  lng: number;
}

class RecurringOptionsDto {
  @ApiProperty({ enum: ['daily', 'weekly', 'monthly']})
  @IsEnum(['daily', 'weekly', 'monthly'])
  type: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  days_of_week?: number[];
}

export class CreateScheduledRideDto {
  @ApiPropertyOptional({ description: 'ID of an existing client' })
  @Transform(({ value }) => typeof value === 'string' ? parseInt(value) : value)
  @IsOptional()
  @IsNumber()
  client_id?: number;

  @ApiPropertyOptional({ description: 'ID of an existing driver' })
  @Transform(({ value }) => typeof value === 'string' ? parseInt(value) : value)
  @IsOptional()
  @IsNumber()
  driver_id?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  client_phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pickup_location: string;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  pickup_coordinates: CoordinatesDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ type: CoordinatesDto })
  @ValidateNested()
  @Type(() => CoordinatesDto)
  destination_coordinates: CoordinatesDto;

  @ApiProperty({ example: '2024-08-15T14:30:00Z' })
  @IsString()
  @IsNotEmpty()
  scheduled_at: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ScheduledRidePriority)
  priority?: ScheduledRidePriority;

  @ApiPropertyOptional({ type: RecurringOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurringOptionsDto)
  recurring?: RecurringOptionsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  recurrent_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
} 