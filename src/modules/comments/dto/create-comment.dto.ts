import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Contenido del comentario',
    example: 'Excelente servicio, muy puntual'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Calificación del servicio (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({
    description: 'ID de la carrera',
    example: 1
  })
  @IsNumber()
  rideId: number;

  @ApiPropertyOptional({
    description: 'Prioridad del comentario',
    example: 'normal'
  })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({
    description: 'Si es un comentario interno',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
} 