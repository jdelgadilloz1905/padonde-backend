import { ApiProperty } from '@nestjs/swagger';
import { Client } from '../../../entities/client.entity';

export class ClientSummaryDto {
  @ApiProperty({
    description: 'ID único del cliente',
    example: 123
  })
  id: number;

  @ApiProperty({
    description: 'Nombre del cliente',
    example: 'Juan'
  })
  first_name: string;

  @ApiProperty({
    description: 'Apellido del cliente',
    example: 'Pérez'
  })
  last_name: string;

  @ApiProperty({
    description: 'Número de teléfono',
    example: '+584121234567'
  })
  phone_number: string;

  @ApiProperty({
    description: 'Email del cliente',
    required: false,
    example: 'juan.perez@email.com'
  })
  email?: string;

  @ApiProperty({
    description: 'Si el cliente está activo',
    example: true
  })
  active: boolean;

  @ApiProperty({
    description: 'Tarifa plana personalizada para cliente VIP (en moneda local)',
    required: false,
    example: 25.50
  })
  flat_rate?: number;

  @ApiProperty({
    description: 'Tarifa por minuto personalizada para el cliente (en moneda local)',
    required: false,
    example: 2.50
  })
  minute_rate?: number;

  @ApiProperty({
    description: 'Indica si el cliente es VIP con tarifas especiales',
    example: false
  })
  is_vip: boolean;

  @ApiProperty({
    description: 'Fecha de registro',
    example: '2025-01-25T10:00:00Z'
  })
  registration_date: Date;

  @ApiProperty({
    description: 'Número total de carreras del cliente',
    example: 15
  })
  total_rides?: number;

  @ApiProperty({
    description: 'Fecha de última carrera',
    required: false,
    example: '2025-01-24T15:30:00Z'
  })
  last_ride_date?: Date;

  @ApiProperty({
    description: 'Notas adicionales sobre el cliente',
    required: false,
    example: 'Cliente frecuente'
  })
  notes?: string;

  @ApiProperty({
    description: 'Tipo de tarifa VIP a aplicar',
    enum: ['flat_rate', 'minute_rate'],
    required: false,
    example: 'flat_rate'
  })
  vip_rate_type?: 'flat_rate' | 'minute_rate';
}

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Página actual',
    example: 1
  })
  currentPage: number;

  @ApiProperty({
    description: 'Elementos por página',
    example: 10
  })
  itemsPerPage: number;

  @ApiProperty({
    description: 'Total de elementos',
    example: 156
  })
  totalItems: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 16
  })
  totalPages: number;

  @ApiProperty({
    description: 'Si hay página anterior',
    example: false
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Si hay página siguiente',
    example: true
  })
  hasNextPage: boolean;
}

export class PaginatedClientsResponseDto {
  @ApiProperty({
    description: 'Lista de clientes',
    type: [ClientSummaryDto]
  })
  data: ClientSummaryDto[];

  @ApiProperty({
    description: 'Metadata de paginación',
    type: PaginationMetaDto
  })
  meta: PaginationMetaDto;

  @ApiProperty({
    description: 'Información adicional de la consulta',
    example: {
      searchTerm: 'Juan',
      filters: { active: true },
      sortBy: 'registration_date',
      sortOrder: 'DESC'
    }
  })
  queryInfo?: {
    searchTerm?: string;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
  };
} 