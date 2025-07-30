import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IncidentType } from '../../incidents/dto/create-incident.dto';

export class ReportIncidentDto {
  @ApiProperty({ 
    description: 'Tipo de incidente', 
    example: 'technical', 
    enum: IncidentType
  })
  @IsEnum(IncidentType)
  @IsNotEmpty()
  incident_type: IncidentType;

  @ApiProperty({ description: 'Título del incidente', example: 'Problema con la aplicación' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Descripción detallada del incidente', example: 'La aplicación se cerró mientras estaba en una carrera.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'ID de la carrera relacionada (si aplica)', example: '123', required: false })
  @IsString()
  @IsOptional()
  ride_id?: string;

  @ApiProperty({ description: 'Ubicación del incidente', example: 'Av. Principal 123', required: false })
  @IsString()
  @IsOptional()
  location?: string;
} 