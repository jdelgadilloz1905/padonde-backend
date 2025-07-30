import { ApiProperty } from '@nestjs/swagger';

export class CommissionSummaryDto {
  @ApiProperty({ description: 'ID de la conductora' })
  driver_id: number;

  @ApiProperty({ description: 'Nombre completo de la conductora' })
  driver_name: string;

  @ApiProperty({ description: 'Número de teléfono de la conductora' })
  driver_phone: string;

  @ApiProperty({ description: 'Total de carreras completadas' })
  total_rides: number;

  @ApiProperty({ description: 'Total facturado (suma de precios de carreras)' })
  total_billed: number;

  @ApiProperty({ description: 'Porcentaje promedio de comisión' })
  average_commission_percentage: number;

  @ApiProperty({ description: 'Total de comisiones generadas' })
  total_commissions: number;

  @ApiProperty({ description: 'Fecha de la primera carrera' })
  first_ride_date: Date;

  @ApiProperty({ description: 'Fecha de la última carrera' })
  last_ride_date: Date;
} 