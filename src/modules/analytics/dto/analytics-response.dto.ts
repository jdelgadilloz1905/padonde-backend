import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class DateRangeDto {
  @ApiProperty({
    description: 'Fecha de inicio (YYYY-MM-DD)',
    example: '2025-07-01',
    required: false
  })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({
    description: 'Fecha de fin (YYYY-MM-DD)',
    example: '2025-07-11',
    required: false
  })
  @IsOptional()
  @IsString()
  end_date?: string;
}

export class AnalyticsDashboardDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalDrivers: number;

  @ApiProperty()
  totalRides: number;

  @ApiProperty()
  completedRides: number;

  @ApiProperty()
  activeRides: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  topDrivers: Array<{
    id: number;
    name: string;
    rating: number;
    totalRides: number;
  }>;

  @ApiProperty()
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: Date;
  }>;
}

export class RidesTotalDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  inProgress: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  todayTotal: number;

  @ApiProperty()
  weekTotal: number;

  @ApiProperty()
  monthTotal: number;
}

export class DriverStatisticsDto {
  @ApiProperty()
  totalDrivers: number;

  @ApiProperty()
  activeDrivers: number;

  @ApiProperty()
  averageRating: number;

  @ApiProperty()
  totalTrips: number;

  @ApiProperty()
  averageTripsPerDriver: number;

  @ApiProperty()
  topPerformers: Array<{
    id: number;
    name: string;
    rating: number;
    trips: number;
    revenue: number;
  }>;
} 