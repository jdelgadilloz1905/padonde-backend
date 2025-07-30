import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RequestLocationDto {
  @ApiProperty({ example: 40.7128 })
  latitude: number;

  @ApiProperty({ example: -74.0060 })
  longitude: number;

  @ApiPropertyOptional({ example: 'Times Square, New York' })
  address?: string;
}

export class RequestClientDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;
}

export class RequestDriverDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Carlos García' })
  name: string;

  @ApiProperty({ example: 'carlos@example.com' })
  email: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ example: 4.8 })
  averageRating?: number;
}

export class RequestResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'pending', enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'] })
  status: string;

  @ApiProperty({ type: RequestLocationDto })
  pickupLocation: RequestLocationDto;

  @ApiProperty({ type: RequestLocationDto })
  dropoffLocation: RequestLocationDto;

  @ApiProperty({ example: 25.50 })
  fare: number;

  @ApiProperty({ example: 8.5 })
  distance: number;

  @ApiProperty({ example: 15 })
  estimatedDuration: number;

  @ApiProperty({ type: RequestClientDto })
  client: RequestClientDto;

  @ApiPropertyOptional({ type: RequestDriverDto })
  driver?: RequestDriverDto;

  @ApiPropertyOptional({ example: '2023-12-01T10:00:00Z' })
  acceptedAt?: Date;

  @ApiPropertyOptional({ example: '2023-12-01T10:05:00Z' })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2023-12-01T10:30:00Z' })
  completedAt?: Date;

  @ApiPropertyOptional({ example: '2023-12-01T10:02:00Z' })
  cancelledAt?: Date;

  @ApiPropertyOptional({ example: 'client' })
  cancelledBy?: string;

  @ApiPropertyOptional({ example: 'Cliente no se presentó' })
  cancellationReason?: string;

  @ApiProperty({ example: '2023-12-01T09:55:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T10:30:00Z' })
  updatedAt: Date;
}

export class RequestStatsDto {
  @ApiProperty({ example: 150 })
  totalRequests: number;

  @ApiProperty({ example: 120 })
  completedRequests: number;

  @ApiProperty({ example: 20 })
  cancelledRequests: number;

  @ApiProperty({ example: 10 })
  pendingRequests: number;

  @ApiProperty({ example: 80.0 })
  completionRate: number;

  @ApiProperty({ example: 13.3 })
  cancellationRate: number;

  @ApiProperty({ example: 2850.75 })
  totalRevenue: number;

  @ApiProperty({ example: 23.76 })
  averageFare: number;

  @ApiProperty({ example: 12.5 })
  averageDistance: number;

  @ApiProperty({ example: 18 })
  averageDuration: number;
}

export class AssignDriverToRequestDto {
  @ApiProperty({ 
    description: 'ID de la conductora a asignar', 
    example: 1,
    type: 'number'
  })
  @IsNumber()
  driverId: number;
} 