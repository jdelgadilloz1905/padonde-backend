import { ApiProperty } from '@nestjs/swagger';
import { DailyMetrics, MonthlyMetrics } from './driver-metrics.dto';

export class DailyMetricsResponseDto {
  @ApiProperty({
    description: 'Métricas del día actual',
    type: DailyMetrics
  })
  today: DailyMetrics;

  @ApiProperty({
    description: 'Métricas acumuladas del mes actual',
    type: MonthlyMetrics
  })
  thisMonth: MonthlyMetrics;

  @ApiProperty({
    description: 'Timestamp de cuando se calcularon las métricas',
    example: '2025-01-09T17:30:00Z'
  })
  timestamp: Date;

  @ApiProperty({
    description: 'ID de la conductora para el cual se calcularon las métricas',
    example: 7
  })
  driverId: number;
} 