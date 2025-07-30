import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelRideDto {
  @ApiProperty({
    description: 'ID del motivo de cancelación',
    example: 1
  })
  @IsNumber()
  reasonId: number;

  @ApiPropertyOptional({
    description: 'Comentario adicional sobre la cancelación',
    example: 'El pasajero no se presentó'
  })
  @IsOptional()
  @IsString()
  additionalComment?: string;
} 