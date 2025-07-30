import { ApiProperty } from '@nestjs/swagger';

export class CommissionDetailDto {
  @ApiProperty({ description: 'Fecha de la carrera' })
  date: Date;

  @ApiProperty({ description: 'ID de la carrera' })
  ride_id: number;

  @ApiProperty({ description: 'Código de seguimiento de la carrera' })
  tracking_code: string;

  @ApiProperty({ description: 'Nombre del cliente' })
  client_name: string;

  @ApiProperty({ description: 'Teléfono del cliente' })
  client_phone: string;

  @ApiProperty({ description: 'Dirección de origen' })
  origin: string;

  @ApiProperty({ description: 'Dirección de destino' })
  destination: string;

  @ApiProperty({ description: 'Monto total de la carrera' })
  amount: number;

  @ApiProperty({ description: 'Porcentaje de comisión aplicado' })
  commission_percentage: number;

  @ApiProperty({ description: 'Monto de la comisión' })
  commission_amount: number;

  @ApiProperty({ description: 'Distancia del viaje en km' })
  distance: number;

  @ApiProperty({ description: 'Duración del viaje en minutos' })
  duration: number;

  @ApiProperty({ description: 'Método de pago utilizado' })
  payment_method: string;
} 