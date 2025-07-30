import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDriverDocumentsDto {
  @ApiProperty({ description: 'URL de la licencia de conducir', example: 'https://storage.example.com/documents/license-123.jpg', required: false })
  @IsString()
  @IsOptional()
  driver_license?: string;

  @ApiProperty({ description: 'URL del documento de identidad', example: 'https://storage.example.com/documents/id-123.jpg', required: false })
  @IsString()
  @IsOptional()
  id_document?: string;

  @ApiProperty({ description: 'URL de la foto del vehículo', example: 'https://storage.example.com/documents/car-123.jpg', required: false })
  @IsString()
  @IsOptional()
  vehicle_photo?: string;
} 