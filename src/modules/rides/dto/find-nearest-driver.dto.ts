import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindNearestDriverDto {
  @ApiPropertyOptional({
    description: 'ID de la carrera',
    example: '22'
  })
  rideId?: string;

  @ApiPropertyOptional({
    description: 'ID de la carrera (alternativo)',
    example: '22'
  })
  rideid?: string;

  @ApiPropertyOptional({
    description: 'Número de teléfono del cliente para buscar carrera pendiente',
    example: '584142517231@s.whatsapp.net'
  })
  phone?: string;
} 