import { ApiProperty } from '@nestjs/swagger';

export class DailyMetrics {
  @ApiProperty({
    description: 'Número de carreras completadas en el día',
    example: 5
  })
  completedRides: number;

  @ApiProperty({
    description: 'Ganancias del día en moneda local',
    example: 1250.00
  })
  dailyEarnings: number;

  @ApiProperty({
    description: 'Valor promedio por viaje del día',
    example: 250.00
  })
  averageRideValue: number;

  @ApiProperty({
    description: 'Horas estimadas online durante el día',
    example: 8.5
  })
  onlineHours: number;
}

export class MonthlyMetrics {
  @ApiProperty({
    description: 'Número total de carreras completadas en el mes',
    example: 120
  })
  completedRides: number;

  @ApiProperty({
    description: 'Ganancias totales del mes',
    example: 25600.00
  })
  totalEarnings: number;

  @ApiProperty({
    description: 'Promedio de ganancias por viaje del mes',
    example: 213.33
  })
  averagePerRide: number;

  @ApiProperty({
    description: 'Total de horas trabajadas en el mes',
    example: 185.5
  })
  totalHours: number;

  @ApiProperty({
    description: 'Bonus acumulado del mes',
    example: 500.00
  })
  monthlyBonus: number;
} 