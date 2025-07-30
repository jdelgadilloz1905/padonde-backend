import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancellationReasonResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Cliente no se presentó' })
  reason: string;

  @ApiPropertyOptional({ example: 'El cliente no llegó al punto de encuentro' })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 'driver', enum: ['client', 'driver', 'both'] })
  userType: string;

  @ApiProperty({ example: '2023-12-01T10:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T10:00:00Z' })
  updatedAt: Date;
} 